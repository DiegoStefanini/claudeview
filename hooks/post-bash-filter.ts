#!/usr/bin/env npx tsx
/**
 * PostToolUse hook for Bash commands.
 *
 * Tracks output sizes and auto-generates filter rules over time.
 * Also provides additionalContext when output is very large,
 * suggesting optimizations to Claude.
 */
import {
  loadFilterConfig,
  findMatchingRule,
  recordOutput,
  autoGenerateRules,
} from '@claudeview/core';

interface HookInput {
  readonly tool_name: string;
  readonly tool_input: { readonly command?: string };
  readonly tool_response: unknown;
}

async function main(): Promise<void> {
  let input: HookInput;
  try {
    const stdin = await readStdin();
    input = JSON.parse(stdin) as HookInput;
  } catch {
    process.exit(0);
    return;
  }

  if (input.tool_name !== 'Bash') {
    process.exit(0);
    return;
  }

  const command = input.tool_input.command ?? '';
  const output = typeof input.tool_response === 'string'
    ? input.tool_response
    : JSON.stringify(input.tool_response);

  const outputLines = output.split('\n').length;
  const outputChars = output.length;
  const estimatedTokens = Math.ceil(outputChars / 4);

  // Record stats for auto-learning
  await recordOutput(command, outputChars, outputLines);

  // Periodically auto-generate new rules
  if (Math.random() < 0.1) {
    await autoGenerateRules();
  }

  // If output is very large, add context suggesting optimization
  if (estimatedTokens > 3000) {
    const config = await loadFilterConfig();
    const rule = findMatchingRule(command, config);

    const context = rule
      ? `[claudeview] Output di "${command.slice(0, 60)}" è ${outputLines} righe (~${estimatedTokens} token). Filtro "${rule.description}" disponibile.`
      : `[claudeview] Output di "${command.slice(0, 60)}" è ${outputLines} righe (~${estimatedTokens} token). Considera di usare output più mirato.`;

    // Return additionalContext to inform Claude
    const result = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: context,
      },
    });
    process.stdout.write(result);
  }

  process.exit(0);
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    // Timeout safety: if no data after 1s, resolve with empty
    setTimeout(() => resolve(data), 1000);
  });
}

main().catch(() => process.exit(0));

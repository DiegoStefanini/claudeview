#!/usr/bin/env npx tsx
/**
 * PreToolUse hook for Bash commands.
 * Wraps commands matching filter rules with output truncation (| head -N).
 * Runs alongside rtk-rewrite.
 */
import {
  loadFilterConfig,
  findMatchingRule,
} from '@claudeview/core';

interface HookInput {
  readonly tool_name: string;
  readonly tool_input: { readonly command?: string };
}

// Commands that should never be filtered
const SKIP_PATTERNS = [
  /\|\s*(head|tail|wc|less|more)/,  // already truncated
  /^(cat|echo|printf|mkdir|touch|cp|mv|rm|chmod)\b/,  // basic file ops
  /^(cd|pwd|which|type|source)\b/,  // shell builtins
  /^(git (add|commit|push|pull|checkout|branch|stash|merge|rebase))\b/,  // git write ops
];

// Commands likely to produce large output
const HEAVY_PATTERNS = [
  /^(npm|npx|yarn|pnpm)\s+(install|build|test|run)/i,
  /^(cargo|make|docker|pip|pip3)\s+/i,
  /^git\s+(log|diff|show)\b/i,
  /^(tsc|npx\s+tsc)/i,
  /^(vitest|jest|pytest|mocha)\b/i,
];

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
  if (command.length < 3) {
    process.exit(0);
    return;
  }

  // Skip commands that shouldn't be filtered
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(command)) {
      process.exit(0);
      return;
    }
  }

  const config = await loadFilterConfig();
  if (!config.enabled) {
    process.exit(0);
    return;
  }

  // Check for matching rule
  const rule = findMatchingRule(command, config);
  let maxLines: number | null = null;

  if (rule) {
    maxLines = rule.maxLines;
  } else {
    // Apply global max only to known heavy commands
    const isHeavy = HEAVY_PATTERNS.some((p) => p.test(command.trim()));
    if (isHeavy) {
      maxLines = config.globalMaxLines;
    }
  }

  if (maxLines === null) {
    process.exit(0);
    return;
  }

  // Wrap command with head truncation
  // Preserve exit code with PIPESTATUS
  const modifiedCommand = `(${command}) 2>&1 | head -n ${maxLines}`;

  const result = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      modifiedToolInput: {
        command: modifiedCommand,
      },
    },
  });

  process.stdout.write(result);
  process.exit(0);
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 1000);
  });
}

main().catch(() => process.exit(0));

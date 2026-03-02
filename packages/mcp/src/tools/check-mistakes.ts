import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadMistakes } from '@claudeview/core';
import type { Mistake } from '@claudeview/core';

function fuzzyMatch(action: string, mistake: Mistake, tags?: readonly string[]): boolean {
  const actionLower = action.toLowerCase();
  const mistakeActionLower = mistake.action.toLowerCase();

  // Direct substring match
  if (mistakeActionLower.includes(actionLower) || actionLower.includes(mistakeActionLower)) {
    return true;
  }

  // Word overlap match
  const actionWords = new Set(actionLower.split(/\s+/).filter((w) => w.length > 2));
  const mistakeWords = mistakeActionLower.split(/\s+/).filter((w) => w.length > 2);
  const overlapCount = mistakeWords.filter((w) => actionWords.has(w)).length;

  if (mistakeWords.length > 0 && overlapCount / mistakeWords.length > 0.4) {
    return true;
  }

  // Tag match
  if (tags && tags.length > 0) {
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    const hasTagMatch = mistake.tags.some((t) => tagSet.has(t.toLowerCase()));
    if (hasTagMatch) {
      return true;
    }
  }

  return false;
}

function formatMatches(matches: readonly Mistake[], action: string): string {
  const lines: string[] = [];

  lines.push(`## Mistake Check: "${action}"`);
  lines.push('');

  if (matches.length === 0) {
    lines.push('No known mistakes match this action. Proceed with confidence.');
    return lines.join('\n');
  }

  lines.push(`Found ${matches.length} matching mistake(s):`);
  lines.push('');

  for (const mistake of matches) {
    lines.push(`### ${mistake.action}`);
    lines.push(`  Error: ${mistake.error}`);
    lines.push(`  Solution: ${mistake.solution}`);
    lines.push(`  Occurrences: ${mistake.occurrences}`);
    if (mistake.tags.length > 0) {
      lines.push(`  Tags: ${mistake.tags.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function registerCheckMistakes(server: McpServer): void {
  server.tool(
    'check_mistakes',
    'Check if a planned action matches any known mistakes before executing',
    {
      action: z.string().describe('The action you plan to take, described in natural language'),
      tags: z.array(z.string()).optional().describe('Optional tags to narrow the search'),
    },
    async ({ action, tags }) => {
      try {
        const mistakes = await loadMistakes();
        const matches = mistakes.filter((m) => fuzzyMatch(action, m, tags));
        const formatted = formatMatches(matches, action);

        return {
          content: [{ type: 'text' as const, text: formatted }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error checking mistakes: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

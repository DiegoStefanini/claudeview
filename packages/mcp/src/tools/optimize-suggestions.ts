import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  findLatestSession,
  loadSession,
  listSessions,
  generateSuggestions,
  calculatePotentialSavings,
} from '@claudeview/core';
import type { OptimizationSuggestion } from '@claudeview/core';

const SEVERITY_ICONS: Record<string, string> = {
  critical: '[CRITICAL]',
  warning: '[WARNING]',
  info: '[INFO]',
};

function formatSuggestions(
  sessionId: string,
  suggestions: readonly OptimizationSuggestion[],
  totalSavings: number,
): string {
  const lines: string[] = [];

  lines.push(`## Optimization Suggestions: Session ${sessionId.slice(0, 8)}...`);
  lines.push('');

  if (suggestions.length === 0) {
    lines.push('No optimization suggestions at this time. Session looks efficient.');
    return lines.join('\n');
  }

  for (const suggestion of suggestions) {
    const icon = SEVERITY_ICONS[suggestion.severity] ?? '[INFO]';
    lines.push(`${icon} ${suggestion.message}`);
    if (suggestion.details) {
      lines.push(`  ${suggestion.details}`);
    }
    if (suggestion.estimatedSavings !== undefined && suggestion.estimatedSavings > 0) {
      lines.push(`  Potential savings: ~${suggestion.estimatedSavings.toLocaleString()} tokens`);
    }
    lines.push('');
  }

  if (totalSavings > 0) {
    lines.push('---');
    lines.push(`Total potential savings: ~${totalSavings.toLocaleString()} tokens`);
  }

  return lines.join('\n');
}

async function resolveSession(sessionId?: string, project?: string) {
  if (sessionId && project) {
    return loadSession(project, sessionId);
  }

  if (project) {
    const sessions = await listSessions(project);
    if (sessions.length === 0) {
      return null;
    }
    const lastSessionId = sessions[sessions.length - 1];
    return loadSession(project, lastSessionId);
  }

  return findLatestSession();
}

export function registerOptimizeSuggestions(server: McpServer): void {
  server.tool(
    'optimize_suggestions',
    'Get live optimization suggestions for the current session',
    {
      sessionId: z.string().optional().describe('Specific session ID to analyze'),
      project: z.string().optional().describe('Project name to look up sessions from'),
    },
    async ({ sessionId, project }) => {
      try {
        const session = await resolveSession(sessionId, project);

        if (!session) {
          return {
            content: [{ type: 'text' as const, text: 'No session found. Provide a project name or session ID, or ensure sessions exist in ~/.claude/projects/.' }],
          };
        }

        const suggestions = generateSuggestions(session);
        const totalSavings = calculatePotentialSavings(suggestions);
        const formatted = formatSuggestions(session.sessionId, suggestions, totalSavings);

        return {
          content: [{ type: 'text' as const, text: formatted }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error generating optimization suggestions: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

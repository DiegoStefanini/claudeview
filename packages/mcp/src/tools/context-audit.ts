import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  findLatestSession,
  loadSession,
  listProjects,
  listSessions,
  analyzeSession,
} from '@claudeview/core';
import type { SessionAnalysis } from '@claudeview/core';

const CONTEXT_WINDOW_TOKENS = 200_000;

function formatAnalysis(analysis: SessionAnalysis): string {
  const lines: string[] = [];

  lines.push(`## Context Audit: Session ${analysis.sessionId.slice(0, 8)}...`);
  lines.push('');

  lines.push('### Token Breakdown');
  for (const entry of analysis.breakdown) {
    const bar = '#'.repeat(Math.max(1, Math.round(entry.percentage / 2)));
    lines.push(`  ${entry.category}: ${entry.tokens.toLocaleString()} (${entry.percentage.toFixed(1)}%) ${bar}`);
    if (entry.details) {
      lines.push(`    ${entry.details}`);
    }
  }
  lines.push('');

  lines.push('### Token Hogs (Top Consumers)');
  if (analysis.tokenHogs.length === 0) {
    lines.push('  No significant token hogs found.');
  } else {
    for (const hog of analysis.tokenHogs) {
      lines.push(`  - ${hog.name} (${hog.type}): ~${hog.estimatedTokens.toLocaleString()} tokens, ${hog.occurrences} calls`);
    }
  }
  lines.push('');

  lines.push('### Cost Estimate');
  lines.push(`  Total tokens: ${analysis.totalTokens.toLocaleString()}`);
  lines.push(`  Estimated cost: $${analysis.estimatedCostUsd.toFixed(4)}`);
  lines.push('');

  const utilization = (analysis.totalTokens / CONTEXT_WINDOW_TOKENS) * 100;
  lines.push('### Context Utilization');
  lines.push(`  ${utilization.toFixed(1)}% of ~${CONTEXT_WINDOW_TOKENS.toLocaleString()} token window`);

  if (utilization > 80) {
    lines.push('  WARNING: Context window nearly full. Consider using /compact.');
  } else if (utilization > 60) {
    lines.push('  NOTICE: Context window filling up. Monitor growth.');
  } else {
    lines.push('  OK: Context window has plenty of room.');
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

export function registerContextAudit(server: McpServer): void {
  server.tool(
    'context_audit',
    'Get a detailed breakdown of token usage in the current or latest session',
    {
      sessionId: z.string().optional().describe('Specific session ID to audit'),
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

        const analysis = analyzeSession(session);
        const formatted = formatAnalysis(analysis);

        return {
          content: [{ type: 'text' as const, text: formatted }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error performing context audit: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

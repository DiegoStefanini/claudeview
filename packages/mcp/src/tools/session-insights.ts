import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listProjects,
  loadAllSessions,
  extractPatterns,
  loadFacets,
  analyzeFriction,
} from '@claudeview/core';
import type { ExtractedPattern, FrictionAnalysis } from '@claudeview/core';

function formatInsights(
  project: string,
  patterns: readonly ExtractedPattern[],
  friction: FrictionAnalysis,
  topTools: readonly { readonly name: string; readonly count: number }[],
): string {
  const lines: string[] = [];

  lines.push(`## Session Insights: ${project}`);
  lines.push('');

  lines.push('### Patterns Found');
  if (patterns.length === 0) {
    lines.push('  No significant patterns detected yet.');
  } else {
    for (const pattern of patterns) {
      lines.push(`  - [${pattern.type}] ${pattern.description}`);
      lines.push(`    Evidence: ${pattern.evidence}`);
      lines.push(`    Suggestion: ${pattern.suggestedInstinct}`);
    }
  }
  lines.push('');

  lines.push('### Friction Analysis');
  lines.push(`  Total sessions analyzed: ${friction.totalSessions}`);
  lines.push(`  Sessions with friction: ${friction.frictionCount} (${(friction.frictionRate * 100).toFixed(1)}%)`);
  if (friction.averageSatisfaction !== null) {
    lines.push(`  Average satisfaction: ${friction.averageSatisfaction.toFixed(2)}/5`);
  }
  if (friction.commonFrictions.length > 0) {
    lines.push('  Common friction points:');
    for (const f of friction.commonFrictions.slice(0, 5)) {
      lines.push(`    - "${f.friction}" (${f.count}x)`);
    }
  }
  lines.push('');

  lines.push('### Top Tool Usage');
  if (topTools.length === 0) {
    lines.push('  No tool usage data available.');
  } else {
    for (const tool of topTools.slice(0, 10)) {
      lines.push(`  - ${tool.name}: ${tool.count} calls`);
    }
  }

  return lines.join('\n');
}

export function registerSessionInsights(server: McpServer): void {
  server.tool(
    'session_insights',
    'Get insights and patterns learned from past sessions for a project',
    {
      project: z.string().optional().describe('Project name to analyze. If omitted, uses the first available project.'),
    },
    async ({ project }) => {
      try {
        let projectName = project;

        if (!projectName) {
          const projects = await listProjects();
          if (projects.length === 0) {
            return {
              content: [{ type: 'text' as const, text: 'No projects found in ~/.claude/projects/.' }],
            };
          }
          projectName = projects[0];
        }

        const sessions = await loadAllSessions(projectName);

        if (sessions.length === 0) {
          return {
            content: [{ type: 'text' as const, text: `No sessions found for project "${projectName}".` }],
          };
        }

        const patterns = extractPatterns(sessions);

        const facets = await loadFacets();
        const friction = analyzeFriction(facets);

        // Aggregate tool usage across all sessions
        const toolCounts: Record<string, number> = {};
        for (const session of sessions) {
          for (const [tool, count] of Object.entries(session.toolCallCounts)) {
            toolCounts[tool] = (toolCounts[tool] ?? 0) + count;
          }
        }

        const topTools = Object.entries(toolCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        const formatted = formatInsights(projectName, patterns, friction, topTools);

        return {
          content: [{ type: 'text' as const, text: formatted }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error generating session insights: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

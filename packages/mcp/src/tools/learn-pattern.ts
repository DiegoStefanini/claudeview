import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createInstinct } from '@claudeview/core';

export function registerLearnPattern(server: McpServer): void {
  server.tool(
    'learn_pattern',
    'Save a new pattern or rule learned from this session',
    {
      pattern: z.string().describe('Short name or identifier for the pattern'),
      description: z.string().describe('Detailed description of the pattern or rule'),
      tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
    },
    async ({ pattern, description, tags }) => {
      try {
        const instinct = await createInstinct({
          pattern,
          description,
          tags: tags ?? [],
        });

        const lines = [
          '## Pattern Saved',
          '',
          `  ID: ${instinct.id}`,
          `  Pattern: ${instinct.pattern}`,
          `  Description: ${instinct.description}`,
          `  Confidence: ${instinct.confidence}`,
          `  Tags: ${instinct.tags.length > 0 ? instinct.tags.join(', ') : 'none'}`,
          '',
          'The pattern has been recorded and will be available for future reference.',
        ];

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error saving pattern: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

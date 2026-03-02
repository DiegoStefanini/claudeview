#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerContextAudit } from './tools/context-audit.js';
import { registerSessionInsights } from './tools/session-insights.js';
import { registerCheckMistakes } from './tools/check-mistakes.js';
import { registerLearnPattern } from './tools/learn-pattern.js';
import { registerOptimizeSuggestions } from './tools/optimize-suggestions.js';

const server = new McpServer({
  name: 'claudeview',
  version: '0.1.0',
});

registerContextAudit(server);
registerSessionInsights(server);
registerCheckMistakes(server);
registerLearnPattern(server);
registerOptimizeSuggestions(server);

const transport = new StdioServerTransport();
await server.connect(transport);

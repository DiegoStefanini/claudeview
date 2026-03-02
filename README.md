# claudeview

Context Profiler + Learning System for Claude Code.

Understand where your tokens go, learn from past sessions, and optimize your Claude Code workflow.

## Features

- **Token Breakdown**: See exactly what consumes your context window (system prompts, file reads, tool results, conversation)
- **Cost Tracking**: Daily/weekly/monthly cost analysis across all projects
- **Learning Engine**: Automatically extract patterns and track mistakes across sessions
- **Optimization Suggestions**: Get actionable advice to reduce token usage
- **MCP Integration**: Live insights directly inside Claude Code

## Installation

```bash
git clone <repo-url> claudeview
cd claudeview
npm install
npm run build
```

### CLI Usage

```bash
# Show token breakdown of latest session
npx claudeview session

# Show token breakdown of a specific session
npx claudeview session <session-id>

# Show costs (day/week/month)
npx claudeview cost
npx claudeview cost --period week
npx claudeview cost --period month

# Show learned patterns
npx claudeview learn

# Show tracked mistakes
npx claudeview mistakes

# Get optimization suggestions
npx claudeview optimize

# Overview dashboard
npx claudeview dashboard
```

### MCP Server Setup

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "claudeview": {
      "command": "node",
      "args": ["/path/to/claudeview/packages/mcp/dist/index.js"]
    }
  }
}
```

Available MCP tools:
- `context_audit` - Real-time token breakdown
- `session_insights` - Patterns from past sessions
- `check_mistakes` - Check if an action is a known mistake
- `learn_pattern` - Save a new pattern/rule
- `optimize_suggestions` - Live optimization advice

## Architecture

```
claudeview/
├── packages/
│   ├── core/    # Shared engine: parser, analyzer, learning, optimizer
│   ├── cli/     # CLI commands with formatted output
│   └── mcp/     # MCP server for Claude Code integration
```

## Data Sources

| Source | Path | Content |
|--------|------|---------|
| Session logs | `~/.claude/projects/{project}/*.jsonl` | Messages, token usage, tool calls |
| Facets | `~/.claude/usage-data/facets/*.json` | Goal, outcome, friction, satisfaction |
| Instincts | `~/.claudeview/instincts/*.json` | Learned patterns with confidence |
| Mistakes | `~/.claudeview/mistakes/*.json` | Tracked errors and solutions |

## Development

```bash
npm run build    # Build all packages
npm test         # Run all tests
npm run clean    # Clean build artifacts
```

## License

MIT

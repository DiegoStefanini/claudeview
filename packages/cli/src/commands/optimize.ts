import chalk from 'chalk';
import Table from 'cli-table3';
import {
  findLatestSession,
  generateSuggestions,
  calculatePotentialSavings,
} from '@claudeview/core';
import type { OptimizationSuggestion } from '@claudeview/core';
import { formatTokens } from '../formatters.js';

function severityColor(severity: OptimizationSuggestion['severity']): (text: string) => string {
  switch (severity) {
    case 'critical':
      return chalk.red;
    case 'warning':
      return chalk.yellow;
    case 'info':
      return chalk.blue;
  }
}

function severityLabel(severity: OptimizationSuggestion['severity']): string {
  const color = severityColor(severity);
  return color(severity.toUpperCase());
}

export async function optimizeCommand(): Promise<void> {
  const session = await findLatestSession();

  if (!session) {
    console.log(chalk.yellow('\n  No sessions found.'));
    console.log(chalk.gray('  Start a Claude Code session first.\n'));
    return;
  }

  const suggestions = generateSuggestions(session);

  console.log(chalk.bold.cyan('\n  Optimization Suggestions'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
  console.log(chalk.gray(`  Session: ${session.sessionId.slice(0, 12)}...`));
  console.log(chalk.gray(`  Project: ${session.projectPath}\n`));

  if (suggestions.length === 0) {
    console.log(chalk.green('  No optimization suggestions. Session looks efficient!\n'));
    return;
  }

  const table = new Table({
    head: ['Severity', 'Type', 'Suggestion', 'Est. Savings'],
    style: { head: ['cyan'], 'padding-left': 1, 'padding-right': 1 },
    colWidths: [12, 15, 40, 14],
    wordWrap: true,
  });

  for (const suggestion of suggestions) {
    table.push([
      severityLabel(suggestion.severity),
      suggestion.type,
      suggestion.message,
      suggestion.estimatedSavings
        ? formatTokens(suggestion.estimatedSavings)
        : chalk.gray('-'),
    ]);
  }

  console.log(table.toString());

  const totalSavings = calculatePotentialSavings(suggestions);
  if (totalSavings > 0) {
    console.log(
      chalk.bold(`\n  Potential savings: ${formatTokens(totalSavings)} tokens\n`)
    );
  } else {
    console.log();
  }
}

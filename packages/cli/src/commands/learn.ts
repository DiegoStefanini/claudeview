import chalk from 'chalk';
import Table from 'cli-table3';
import { loadInstincts } from '@claudeview/core';
import { formatConfidence } from '../formatters.js';

export async function learnCommand(): Promise<void> {
  const instincts = await loadInstincts();

  if (instincts.length === 0) {
    console.log(chalk.bold.cyan('\n  Learned Instincts'));
    console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
    console.log(chalk.yellow('  No instincts learned yet.'));
    console.log(chalk.gray('  Instincts are patterns discovered from your Claude Code usage.'));
    console.log(chalk.gray('  Use the MCP tools or CLI to create instincts from sessions.\n'));
    return;
  }

  console.log(chalk.bold.cyan('\n  Learned Instincts'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));

  const table = new Table({
    head: ['Pattern', 'Description', 'Confidence', 'Seen', 'Last Seen'],
    style: { head: ['cyan'], 'padding-left': 1, 'padding-right': 1 },
    colWidths: [20, 30, 22, 6, 12],
    wordWrap: true,
  });

  for (const instinct of instincts) {
    const lastSeen = instinct.lastSeen
      ? instinct.lastSeen.slice(0, 10)
      : 'unknown';

    table.push([
      instinct.pattern,
      instinct.description,
      formatConfidence(instinct.confidence),
      String(instinct.occurrences),
      lastSeen,
    ]);
  }

  console.log(table.toString());
  console.log(chalk.gray(`\n  ${instincts.length} instinct(s) total\n`));
}

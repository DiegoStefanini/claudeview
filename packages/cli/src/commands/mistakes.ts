import chalk from 'chalk';
import Table from 'cli-table3';
import { loadMistakes } from '@claudeview/core';

export async function mistakesCommand(): Promise<void> {
  const mistakes = await loadMistakes();

  if (mistakes.length === 0) {
    console.log(chalk.bold.cyan('\n  Tracked Mistakes'));
    console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
    console.log(chalk.yellow('  No mistakes recorded yet.'));
    console.log(chalk.gray('  Mistakes are tracked to help avoid repeating common errors.'));
    console.log(chalk.gray('  Use the MCP tools or CLI to record mistakes from sessions.\n'));
    return;
  }

  console.log(chalk.bold.cyan('\n  Tracked Mistakes'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));

  const table = new Table({
    head: ['Action', 'Error', 'Solution', 'Count'],
    style: { head: ['cyan'], 'padding-left': 1, 'padding-right': 1 },
    colWidths: [20, 25, 30, 7],
    wordWrap: true,
  });

  for (const mistake of mistakes) {
    table.push([
      mistake.action,
      chalk.red(mistake.error),
      chalk.green(mistake.solution),
      String(mistake.occurrences),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.gray(`\n  ${mistakes.length} mistake(s) total\n`));
}

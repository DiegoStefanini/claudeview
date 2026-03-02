import chalk from 'chalk';
import Table from 'cli-table3';
import {
  listProjects,
  listSessions,
  loadAllSessions,
  analyzeSession,
  calculateCost,
} from '@claudeview/core';
import { formatTokens, formatCost } from '../formatters.js';

interface ProjectStats {
  readonly name: string;
  readonly sessionCount: number;
  readonly totalTokens: number;
  readonly totalCost: number;
}

export async function dashboardCommand(): Promise<void> {
  const projects = await listProjects();

  if (projects.length === 0) {
    console.log(chalk.bold.cyan('\n  Dashboard'));
    console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
    console.log(chalk.yellow('  No projects found.'));
    console.log(chalk.gray('  Start a Claude Code session to generate data.\n'));
    return;
  }

  console.log(chalk.bold.cyan('\n  Dashboard'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));

  const projectStats: ProjectStats[] = [];
  let grandTotalTokens = 0;
  let grandTotalCost = 0;
  let grandTotalSessions = 0;

  for (const project of projects) {
    const sessionIds = await listSessions(project);
    const sessions = await loadAllSessions(project);

    let projectTokens = 0;
    let projectCost = 0;

    for (const session of sessions) {
      const analysis = analyzeSession(session);
      projectTokens += analysis.totalTokens;
      projectCost += calculateCost(session);
    }

    projectStats.push({
      name: project,
      sessionCount: sessionIds.length,
      totalTokens: projectTokens,
      totalCost: projectCost,
    });

    grandTotalTokens += projectTokens;
    grandTotalCost += projectCost;
    grandTotalSessions += sessionIds.length;
  }

  // Sort by total tokens descending
  const sorted = [...projectStats].sort((a, b) => b.totalTokens - a.totalTokens);

  const table = new Table({
    head: ['Project', 'Sessions', 'Total Tokens', 'Cost (USD)'],
    style: { head: ['cyan'], 'padding-left': 1, 'padding-right': 1 },
  });

  for (const stats of sorted) {
    table.push([
      stats.name,
      String(stats.sessionCount),
      formatTokens(stats.totalTokens),
      formatCost(stats.totalCost),
    ]);
  }

  table.push([
    chalk.bold('Total'),
    chalk.bold(String(grandTotalSessions)),
    chalk.bold(formatTokens(grandTotalTokens)),
    chalk.bold(formatCost(grandTotalCost)),
  ]);

  console.log(table.toString());

  if (sorted.length > 0) {
    console.log(
      chalk.gray(`\n  Most active: ${chalk.white(sorted[0].name)} (${formatTokens(sorted[0].totalTokens)} tokens)`)
    );
  }

  console.log(chalk.gray(`  ${projects.length} project(s), ${grandTotalSessions} session(s)\n`));
}

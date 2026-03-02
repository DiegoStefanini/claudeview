import chalk from 'chalk';
import Table from 'cli-table3';
import {
  listProjects,
  loadAllSessions,
  computeDailyCosts,
  computeWeeklyCosts,
  computeMonthlyCosts,
} from '@claudeview/core';
import type { CostEntry, SessionSummary } from '@claudeview/core';
import { formatTokens, formatCost } from '../formatters.js';

async function loadFilteredSessions(project?: string): Promise<readonly SessionSummary[]> {
  const projects = project ? [project] : await listProjects();
  const allSessions: SessionSummary[] = [];

  for (const p of projects) {
    const sessions = await loadAllSessions(p);
    allSessions.push(...sessions);
  }

  return allSessions;
}

function renderCostTable(entries: readonly CostEntry[], periodLabel: string): void {
  if (entries.length === 0) {
    console.log(chalk.yellow(`\n  No cost data available for ${periodLabel} view.\n`));
    return;
  }

  console.log(chalk.bold.cyan(`\n  Costs by ${periodLabel}`));
  console.log(chalk.gray('  ' + '\u2500'.repeat(60)));

  const table = new Table({
    head: ['Date', 'Input', 'Output', 'Cost (USD)', 'Sessions'],
    style: { head: ['cyan'], 'padding-left': 1, 'padding-right': 1 },
  });

  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let totalSessions = 0;

  for (const entry of entries) {
    table.push([
      entry.date,
      formatTokens(entry.inputTokens),
      formatTokens(entry.outputTokens),
      formatCost(entry.estimatedCostUsd),
      String(entry.sessionCount),
    ]);

    totalInput += entry.inputTokens;
    totalOutput += entry.outputTokens;
    totalCost += entry.estimatedCostUsd;
    totalSessions += entry.sessionCount;
  }

  table.push([
    chalk.bold('Total'),
    chalk.bold(formatTokens(totalInput)),
    chalk.bold(formatTokens(totalOutput)),
    chalk.bold(formatCost(totalCost)),
    chalk.bold(String(totalSessions)),
  ]);

  console.log(table.toString());
  console.log();
}

export async function costCommand(options: {
  readonly period: string;
  readonly project?: string;
}): Promise<void> {
  const sessions = await loadFilteredSessions(options.project);

  if (sessions.length === 0) {
    console.log(chalk.yellow('\n  No sessions found.'));
    if (options.project) {
      console.log(chalk.gray(`  No data for project "${options.project}".`));
    }
    console.log();
    return;
  }

  const dailyCosts = computeDailyCosts(sessions);

  switch (options.period) {
    case 'week': {
      const weeklyCosts = computeWeeklyCosts(dailyCosts);
      renderCostTable(weeklyCosts, 'Week');
      break;
    }
    case 'month': {
      const monthlyCosts = computeMonthlyCosts(dailyCosts);
      renderCostTable(monthlyCosts, 'Month');
      break;
    }
    default: {
      renderCostTable(dailyCosts, 'Day');
      break;
    }
  }
}

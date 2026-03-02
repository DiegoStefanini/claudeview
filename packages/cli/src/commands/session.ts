import chalk from 'chalk';
import Table from 'cli-table3';
import {
  findLatestSession,
  listProjects,
  listSessions,
  loadSession,
  analyzeSession,
} from '@claudeview/core';
import type { SessionSummary, SessionAnalysis } from '@claudeview/core';
import { formatTokens, formatCost, formatDuration, formatPercentage } from '../formatters.js';

async function resolveSession(sessionId?: string): Promise<SessionSummary | null> {
  if (!sessionId) {
    return findLatestSession();
  }

  const projects = await listProjects();
  for (const project of projects) {
    const sessions = await listSessions(project);
    const match = sessions.find((s) => s === sessionId || s.startsWith(sessionId));
    if (match) {
      return loadSession(project, match);
    }
  }

  return null;
}

function computeDurationMs(session: SessionSummary): number | null {
  if (!session.startTime || !session.endTime) return null;
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  const diff = end - start;
  return diff > 0 ? diff : null;
}

function renderSummary(session: SessionSummary, analysis: SessionAnalysis): void {
  const durationMs = computeDurationMs(session);

  console.log(chalk.bold.cyan('\n  Session Summary'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));
  console.log(`  ${chalk.gray('ID:')}         ${session.sessionId.slice(0, 12)}...`);
  console.log(`  ${chalk.gray('Project:')}    ${session.projectPath}`);
  console.log(`  ${chalk.gray('Messages:')}   ${session.messageCount}`);
  if (durationMs !== null) {
    console.log(`  ${chalk.gray('Duration:')}   ${formatDuration(durationMs)}`);
  }
  console.log(`  ${chalk.gray('Total:')}      ${formatTokens(analysis.totalTokens)} tokens`);
  console.log(`  ${chalk.gray('Cost:')}       ${formatCost(analysis.estimatedCostUsd)}`);
  console.log();
}

function renderBreakdown(analysis: SessionAnalysis): void {
  if (analysis.breakdown.length === 0) {
    console.log(chalk.yellow('  No token breakdown data available.\n'));
    return;
  }

  console.log(chalk.bold.cyan('  Token Breakdown'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));

  const table = new Table({
    head: ['Category', 'Tokens', '%'],
    style: { head: ['cyan'], 'padding-left': 1, 'padding-right': 1 },
  });

  for (const entry of analysis.breakdown) {
    table.push([
      entry.category,
      formatTokens(entry.tokens),
      formatPercentage(entry.percentage),
    ]);
  }

  console.log(table.toString());
  console.log();
}

function renderTokenHogs(analysis: SessionAnalysis): void {
  const hogs = analysis.tokenHogs.slice(0, 5);
  if (hogs.length === 0) {
    return;
  }

  console.log(chalk.bold.cyan('  Top Token Hogs'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));

  const table = new Table({
    head: ['Name', 'Type', 'Est. Tokens', 'Calls'],
    style: { head: ['cyan'], 'padding-left': 1, 'padding-right': 1 },
  });

  for (const hog of hogs) {
    table.push([
      hog.name,
      hog.type,
      formatTokens(hog.estimatedTokens),
      String(hog.occurrences),
    ]);
  }

  console.log(table.toString());
  console.log();
}

function renderContextGrowth(analysis: SessionAnalysis): void {
  const trends = analysis.trends;
  if (trends.length === 0) {
    return;
  }

  console.log(chalk.bold.cyan('  Context Growth'));
  console.log(chalk.gray('  ' + '\u2500'.repeat(50)));

  const maxTokens = trends[trends.length - 1].cumulativeInputTokens || 1;
  const barWidth = 40;
  const step = Math.max(1, Math.floor(trends.length / 8));

  for (let i = 0; i < trends.length; i += step) {
    const trend = trends[i];
    const ratio = trend.cumulativeInputTokens / maxTokens;
    const filled = Math.round(ratio * barWidth);
    const bar = chalk.green('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(barWidth - filled));
    const label = formatTokens(trend.cumulativeInputTokens).padStart(8);
    console.log(`  ${chalk.gray(`#${String(trend.messageIndex).padStart(3)}`)} ${bar} ${label}`);
  }

  // Always show last entry
  const last = trends[trends.length - 1];
  if (trends.length % step !== 1) {
    const ratio = last.cumulativeInputTokens / maxTokens;
    const filled = Math.round(ratio * barWidth);
    const bar = chalk.green('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(barWidth - filled));
    const label = formatTokens(last.cumulativeInputTokens).padStart(8);
    console.log(`  ${chalk.gray(`#${String(last.messageIndex).padStart(3)}`)} ${bar} ${label}`);
  }

  console.log();
}

export async function sessionCommand(sessionId?: string): Promise<void> {
  const session = await resolveSession(sessionId);

  if (!session) {
    console.log(chalk.yellow('No session found.'));
    if (sessionId) {
      console.log(chalk.gray(`Could not find session matching "${sessionId}".`));
    } else {
      console.log(chalk.gray('No sessions available. Start a Claude Code session first.'));
    }
    return;
  }

  const analysis = analyzeSession(session);

  renderSummary(session, analysis);
  renderBreakdown(analysis);
  renderTokenHogs(analysis);
  renderContextGrowth(analysis);
}

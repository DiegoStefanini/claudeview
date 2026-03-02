#!/usr/bin/env node

import { Command } from 'commander';
import { sessionCommand } from './commands/session.js';
import { costCommand } from './commands/cost.js';
import { learnCommand } from './commands/learn.js';
import { mistakesCommand } from './commands/mistakes.js';
import { optimizeCommand } from './commands/optimize.js';
import { dashboardCommand } from './commands/dashboard.js';
import { filtersCommand } from './commands/filters.js';

const program = new Command();

program
  .name('claudeview')
  .description('Context profiler and learning system for Claude Code')
  .version('0.1.0');

program
  .command('session')
  .description('Show token breakdown of a session (default: latest)')
  .argument('[id]', 'session ID or prefix')
  .action(async (id?: string) => {
    await sessionCommand(id);
  });

program
  .command('cost')
  .description('Show costs by day/week/month')
  .option('-p, --period <period>', 'period: day, week, or month', 'day')
  .option('--project <name>', 'filter by project name')
  .action(async (options: { period: string; project?: string }) => {
    await costCommand(options);
  });

program
  .command('learn')
  .description('Show learned instincts with confidence')
  .action(async () => {
    await learnCommand();
  });

program
  .command('mistakes')
  .description('List tracked mistakes and solutions')
  .action(async () => {
    await mistakesCommand();
  });

program
  .command('optimize')
  .description('Show optimization suggestions for latest session')
  .action(async () => {
    await optimizeCommand();
  });

program
  .command('dashboard')
  .description('Overview of all projects and sessions')
  .action(async () => {
    await dashboardCommand();
  });

program
  .command('filters')
  .description('Show and manage output filter rules')
  .option('--auto-update', 'auto-generate new rules from tracked data')
  .action(async (options: { autoUpdate?: boolean }) => {
    await filtersCommand(options);
  });

program.parse();

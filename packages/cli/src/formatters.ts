import chalk from 'chalk';

export function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return String(n);
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export function formatPercentage(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatConfidence(n: number): string {
  const filled = Math.round(n * 10);
  const empty = 10 - filled;
  const bar = chalk.green('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(empty));
  return `${bar} ${n.toFixed(2)}`;
}

import type { SessionSummary, CostEntry } from './types.js';
import { calculateCost } from './token-analyzer.js';

export function computeDailyCosts(sessions: readonly SessionSummary[]): readonly CostEntry[] {
  const dailyMap = new Map<string, {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    cost: number;
    sessionCount: number;
  }>();

  for (const session of sessions) {
    const date = session.startTime
      ? session.startTime.slice(0, 10)
      : 'unknown';

    const existing = dailyMap.get(date) ?? {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      cost: 0,
      sessionCount: 0,
    };

    existing.inputTokens += session.totalInputTokens;
    existing.outputTokens += session.totalOutputTokens;
    existing.cacheCreationTokens += session.totalCacheCreationTokens;
    existing.cacheReadTokens += session.totalCacheReadTokens;
    existing.cost += calculateCost(session);
    existing.sessionCount += 1;

    dailyMap.set(date, existing);
  }

  const entries: CostEntry[] = [];
  for (const [date, data] of dailyMap) {
    entries.push({
      date,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cacheCreationTokens: data.cacheCreationTokens,
      cacheReadTokens: data.cacheReadTokens,
      estimatedCostUsd: data.cost,
      sessionCount: data.sessionCount,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeWeeklyCosts(dailyCosts: readonly CostEntry[]): readonly CostEntry[] {
  const weeklyMap = new Map<string, CostEntry & { readonly date: string }>();

  for (const day of dailyCosts) {
    if (day.date === 'unknown') continue;
    const d = new Date(day.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);

    const existing = weeklyMap.get(weekKey);
    if (existing) {
      weeklyMap.set(weekKey, {
        date: weekKey,
        inputTokens: existing.inputTokens + day.inputTokens,
        outputTokens: existing.outputTokens + day.outputTokens,
        cacheCreationTokens: existing.cacheCreationTokens + day.cacheCreationTokens,
        cacheReadTokens: existing.cacheReadTokens + day.cacheReadTokens,
        estimatedCostUsd: existing.estimatedCostUsd + day.estimatedCostUsd,
        sessionCount: existing.sessionCount + day.sessionCount,
      });
    } else {
      weeklyMap.set(weekKey, { ...day, date: weekKey });
    }
  }

  return [...weeklyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function computeMonthlyCosts(dailyCosts: readonly CostEntry[]): readonly CostEntry[] {
  const monthlyMap = new Map<string, CostEntry>();

  for (const day of dailyCosts) {
    if (day.date === 'unknown') continue;
    const monthKey = day.date.slice(0, 7);

    const existing = monthlyMap.get(monthKey);
    if (existing) {
      monthlyMap.set(monthKey, {
        date: monthKey,
        inputTokens: existing.inputTokens + day.inputTokens,
        outputTokens: existing.outputTokens + day.outputTokens,
        cacheCreationTokens: existing.cacheCreationTokens + day.cacheCreationTokens,
        cacheReadTokens: existing.cacheReadTokens + day.cacheReadTokens,
        estimatedCostUsd: existing.estimatedCostUsd + day.estimatedCostUsd,
        sessionCount: existing.sessionCount + day.sessionCount,
      });
    } else {
      monthlyMap.set(monthKey, { ...day, date: monthKey });
    }
  }

  return [...monthlyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

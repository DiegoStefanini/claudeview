import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Instinct, Mistake, Facet, SessionSummary } from './types.js';

const CLAUDEVIEW_DIR = join(homedir(), '.claudeview');
const INSTINCTS_DIR = join(CLAUDEVIEW_DIR, 'instincts');
const MISTAKES_DIR = join(CLAUDEVIEW_DIR, 'mistakes');
const FACETS_DIR = join(homedir(), '.claude', 'usage-data', 'facets');

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

// --- Instinct Management ---

export async function loadInstincts(): Promise<readonly Instinct[]> {
  await ensureDir(INSTINCTS_DIR);
  try {
    const files = await readdir(INSTINCTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    const instincts = await Promise.all(
      jsonFiles.map(async (f) => {
        const content = await readFile(join(INSTINCTS_DIR, f), 'utf-8');
        return JSON.parse(content) as Instinct;
      })
    );
    return instincts.sort((a, b) => b.confidence - a.confidence);
  } catch {
    return [];
  }
}

export async function saveInstinct(instinct: Instinct): Promise<void> {
  await ensureDir(INSTINCTS_DIR);
  const filePath = join(INSTINCTS_DIR, `${instinct.id}.json`);
  await writeFile(filePath, JSON.stringify(instinct, null, 2), 'utf-8');
}

export async function createInstinct(params: {
  readonly pattern: string;
  readonly description: string;
  readonly projectPath?: string;
  readonly tags?: readonly string[];
}): Promise<Instinct> {
  const instinct: Instinct = {
    id: randomUUID(),
    pattern: params.pattern,
    description: params.description,
    confidence: 0.5,
    occurrences: 1,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    projectPath: params.projectPath,
    tags: params.tags ?? [],
  };
  await saveInstinct(instinct);
  return instinct;
}

export async function reinforceInstinct(id: string): Promise<Instinct | null> {
  const instincts = await loadInstincts();
  const existing = instincts.find((i) => i.id === id);
  if (!existing) return null;

  const updated: Instinct = {
    ...existing,
    confidence: Math.min(1.0, existing.confidence + 0.1),
    occurrences: existing.occurrences + 1,
    lastSeen: new Date().toISOString(),
  };
  await saveInstinct(updated);
  return updated;
}

// --- Mistake Management ---

export async function loadMistakes(): Promise<readonly Mistake[]> {
  await ensureDir(MISTAKES_DIR);
  try {
    const files = await readdir(MISTAKES_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    const mistakes = await Promise.all(
      jsonFiles.map(async (f) => {
        const content = await readFile(join(MISTAKES_DIR, f), 'utf-8');
        return JSON.parse(content) as Mistake;
      })
    );
    return mistakes.sort((a, b) => b.occurrences - a.occurrences);
  } catch {
    return [];
  }
}

export async function saveMistake(mistake: Mistake): Promise<void> {
  await ensureDir(MISTAKES_DIR);
  const filePath = join(MISTAKES_DIR, `${mistake.id}.json`);
  await writeFile(filePath, JSON.stringify(mistake, null, 2), 'utf-8');
}

export async function recordMistake(params: {
  readonly action: string;
  readonly error: string;
  readonly solution: string;
  readonly projectPath?: string;
  readonly tags?: readonly string[];
}): Promise<Mistake> {
  const mistakes = await loadMistakes();
  const existing = mistakes.find(
    (m) => m.action === params.action && m.error === params.error
  );

  if (existing) {
    const updated: Mistake = {
      ...existing,
      solution: params.solution,
      occurrences: existing.occurrences + 1,
      timestamp: new Date().toISOString(),
    };
    await saveMistake(updated);
    return updated;
  }

  const mistake: Mistake = {
    id: randomUUID(),
    action: params.action,
    error: params.error,
    solution: params.solution,
    timestamp: new Date().toISOString(),
    projectPath: params.projectPath,
    occurrences: 1,
    tags: params.tags ?? [],
  };
  await saveMistake(mistake);
  return mistake;
}

// --- Facet Analysis ---

export async function loadFacets(): Promise<readonly Facet[]> {
  try {
    const files = await readdir(FACETS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    const facets = await Promise.all(
      jsonFiles.map(async (f) => {
        const content = await readFile(join(FACETS_DIR, f), 'utf-8');
        return JSON.parse(content) as Facet;
      })
    );
    return facets;
  } catch {
    return [];
  }
}

export interface FrictionAnalysis {
  readonly totalSessions: number;
  readonly frictionCount: number;
  readonly frictionRate: number;
  readonly commonFrictions: readonly { readonly friction: string; readonly count: number }[];
  readonly averageSatisfaction: number | null;
}

export function analyzeFriction(facets: readonly Facet[]): FrictionAnalysis {
  const totalSessions = facets.length;
  const frictionFacets = facets.filter((f) => f.friction);
  const frictionCount = frictionFacets.length;

  const frictionCounts: Record<string, number> = {};
  for (const f of frictionFacets) {
    if (f.friction) {
      frictionCounts[f.friction] = (frictionCounts[f.friction] ?? 0) + 1;
    }
  }

  const commonFrictions = Object.entries(frictionCounts)
    .map(([friction, count]) => ({ friction, count }))
    .sort((a, b) => b.count - a.count);

  const satisfactions = facets
    .filter((f) => f.satisfaction !== undefined && f.satisfaction !== null)
    .map((f) => f.satisfaction!);

  const averageSatisfaction =
    satisfactions.length > 0
      ? satisfactions.reduce((sum, s) => sum + s, 0) / satisfactions.length
      : null;

  return {
    totalSessions,
    frictionCount,
    frictionRate: totalSessions > 0 ? frictionCount / totalSessions : 0,
    commonFrictions,
    averageSatisfaction,
  };
}

// --- Pattern Extraction from Sessions ---

export interface ExtractedPattern {
  readonly type: 'repeated_error' | 'tool_overuse' | 'large_file_read' | 'friction';
  readonly description: string;
  readonly evidence: string;
  readonly suggestedInstinct: string;
}

export function extractPatterns(sessions: readonly SessionSummary[]): readonly ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];

  // Find tools used excessively
  const globalToolCounts: Record<string, number> = {};
  for (const session of sessions) {
    for (const [tool, count] of Object.entries(session.toolCallCounts)) {
      globalToolCounts[tool] = (globalToolCounts[tool] ?? 0) + count;
    }
  }

  for (const [tool, count] of Object.entries(globalToolCounts)) {
    if (count > 50) {
      patterns.push({
        type: 'tool_overuse',
        description: `Tool "${tool}" used ${count} times across ${sessions.length} sessions`,
        evidence: `${count} invocations`,
        suggestedInstinct: `Consider if all "${tool}" calls are necessary. Look for patterns to reduce usage.`,
      });
    }
  }

  // Find sessions with very high token usage
  for (const session of sessions) {
    if (session.totalInputTokens > 500_000) {
      patterns.push({
        type: 'large_file_read',
        description: `Session ${session.sessionId.slice(0, 8)} used ${(session.totalInputTokens / 1000).toFixed(0)}k input tokens`,
        evidence: `${session.messageCount} messages`,
        suggestedInstinct: 'Consider using /compact more aggressively or reading file sections instead of entire files.',
      });
    }
  }

  return patterns;
}

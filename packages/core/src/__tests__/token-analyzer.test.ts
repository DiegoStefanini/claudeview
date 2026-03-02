import { describe, it, expect } from 'vitest';
import { analyzeSession, calculateCost, estimateTokens } from '../token-analyzer.js';
import type { SessionSummary } from '../types.js';

function createMockSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: 'test-session',
    projectPath: 'test-project',
    messageCount: 5,
    messages: [
      {
        role: 'user',
        contentLength: 100,
        toolCalls: [],
      },
      {
        role: 'assistant',
        contentLength: 500,
        toolCalls: [{ name: 'Read' }],
        usage: { input_tokens: 10000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 200 },
      },
      {
        role: 'assistant',
        contentLength: 2000,
        toolCalls: [{ name: 'Read' }],
        type: 'tool_result',
        usage: { input_tokens: 15000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 100 },
      },
      {
        role: 'assistant',
        contentLength: 300,
        toolCalls: [{ name: 'Edit' }],
        usage: { input_tokens: 20000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 150 },
      },
      {
        role: 'user',
        contentLength: 50,
        toolCalls: [],
      },
    ],
    totalInputTokens: 45000,
    totalOutputTokens: 450,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    toolCallCounts: { Read: 2, Edit: 1 },
    ...overrides,
  };
}

describe('analyzeSession', () => {
  it('should produce a valid analysis', () => {
    const session = createMockSession();
    const analysis = analyzeSession(session);

    expect(analysis.sessionId).toBe('test-session');
    expect(analysis.totalTokens).toBe(45450);
    expect(analysis.breakdown.length).toBeGreaterThan(0);
  });

  it('should identify token hogs', () => {
    const session = createMockSession();
    const analysis = analyzeSession(session);

    expect(analysis.tokenHogs.length).toBeGreaterThan(0);
    expect(analysis.tokenHogs[0].type).toBe('tool');
  });

  it('should compute trends', () => {
    const session = createMockSession();
    const analysis = analyzeSession(session);

    expect(analysis.trends.length).toBe(3); // 3 messages with usage
    expect(analysis.trends[2].cumulativeInputTokens).toBe(45000);
  });

  it('should calculate cost', () => {
    const session = createMockSession();
    const analysis = analyzeSession(session);

    expect(analysis.estimatedCostUsd).toBeGreaterThan(0);
  });
});

describe('calculateCost', () => {
  it('should calculate input + output costs', () => {
    const session = createMockSession({
      totalInputTokens: 1_000_000,
      totalOutputTokens: 100_000,
    });

    const cost = calculateCost(session);
    // 1M * $3/1M + 100k * $15/1M = $3 + $1.5 = $4.5
    expect(cost).toBeCloseTo(4.5, 1);
  });

  it('should include cache costs', () => {
    const session = createMockSession({
      totalInputTokens: 100_000,
      totalOutputTokens: 10_000,
      totalCacheCreationTokens: 50_000,
      totalCacheReadTokens: 200_000,
    });

    const cost = calculateCost(session);
    expect(cost).toBeGreaterThan(0);
  });
});

describe('estimateTokens', () => {
  it('should estimate ~4 chars per token', () => {
    expect(estimateTokens(400)).toBe(100);
    expect(estimateTokens(1)).toBe(1);
    expect(estimateTokens(0)).toBe(0);
  });
});

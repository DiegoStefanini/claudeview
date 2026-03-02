import { describe, it, expect } from 'vitest';
import { generateSuggestions, calculatePotentialSavings } from '../optimizer.js';
import type { SessionSummary } from '../types.js';

function createMockSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: 'test',
    projectPath: 'test',
    messageCount: 10,
    messages: [],
    totalInputTokens: 50000,
    totalOutputTokens: 5000,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    toolCallCounts: {},
    ...overrides,
  };
}

describe('generateSuggestions', () => {
  it('should warn when context is above 80%', () => {
    const session = createMockSession({ totalInputTokens: 180_000 });
    const suggestions = generateSuggestions(session);

    const critical = suggestions.find((s) => s.severity === 'critical');
    expect(critical).toBeDefined();
    expect(critical!.type).toBe('context_size');
  });

  it('should warn about large file reads', () => {
    const session = createMockSession({
      messages: [
        {
          role: 'assistant',
          contentLength: 50000,
          toolCalls: [{ name: 'Read' }],
        },
      ],
    });

    const suggestions = generateSuggestions(session);
    const fileWarning = suggestions.find((s) => s.type === 'file_read');
    expect(fileWarning).toBeDefined();
  });

  it('should note heavy tool usage', () => {
    const session = createMockSession({
      toolCallCounts: { Read: 25, Grep: 30, Edit: 50 },
    });

    const suggestions = generateSuggestions(session);
    const toolSuggestions = suggestions.filter((s) => s.type === 'tool_usage');
    expect(toolSuggestions.length).toBeGreaterThan(0);
  });

  it('should suggest caching when no cache hits', () => {
    const session = createMockSession({
      totalInputTokens: 100_000,
      totalCacheReadTokens: 0,
    });

    const suggestions = generateSuggestions(session);
    const cacheSuggestion = suggestions.find((s) => s.type === 'caching');
    expect(cacheSuggestion).toBeDefined();
  });

  it('should return empty for small sessions', () => {
    const session = createMockSession({
      totalInputTokens: 1000,
      totalOutputTokens: 100,
      totalCacheReadTokens: 0,
    });

    const suggestions = generateSuggestions(session);
    // Small session should have minimal suggestions
    const critical = suggestions.filter((s) => s.severity === 'critical');
    expect(critical.length).toBe(0);
  });
});

describe('calculatePotentialSavings', () => {
  it('should sum all estimated savings', () => {
    const suggestions = [
      { type: 'context_size' as const, severity: 'critical' as const, message: 'test', estimatedSavings: 1000 },
      { type: 'file_read' as const, severity: 'warning' as const, message: 'test', estimatedSavings: 500 },
      { type: 'tool_usage' as const, severity: 'info' as const, message: 'test' },
    ];

    expect(calculatePotentialSavings(suggestions)).toBe(1500);
  });
});

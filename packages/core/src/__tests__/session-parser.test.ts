import { describe, it, expect } from 'vitest';
import { parseJsonlContent } from '../session-parser.js';

const SAMPLE_JSONL = [
  JSON.stringify({
    type: 'message',
    message: {
      role: 'user',
      content: 'Hello, help me with this code',
      usage: { input_tokens: 1000, cache_creation_input_tokens: 500, cache_read_input_tokens: 0, output_tokens: 0 },
    },
    timestamp: '2026-03-01T10:00:00Z',
  }),
  JSON.stringify({
    type: 'message',
    message: {
      role: 'assistant',
      content: 'Sure, let me help you with that.',
      usage: { input_tokens: 2000, cache_creation_input_tokens: 0, cache_read_input_tokens: 800, output_tokens: 150 },
    },
    timestamp: '2026-03-01T10:00:05Z',
    toolName: 'Read',
    toolInput: { file_path: '/src/index.ts' },
  }),
  JSON.stringify({
    type: 'tool_result',
    message: {
      role: 'assistant',
      content: 'Here is the file content...',
      usage: { input_tokens: 5000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 200 },
    },
    timestamp: '2026-03-01T10:00:10Z',
  }),
].join('\n');

describe('parseJsonlContent', () => {
  it('should parse JSONL content into a session summary', () => {
    const result = parseJsonlContent(SAMPLE_JSONL, 'test-session', 'test-project');

    expect(result.sessionId).toBe('test-session');
    expect(result.projectPath).toBe('test-project');
    expect(result.messageCount).toBe(3);
  });

  it('should calculate total tokens correctly', () => {
    const result = parseJsonlContent(SAMPLE_JSONL, 'test-session', 'test-project');

    expect(result.totalInputTokens).toBe(8000); // 1000 + 2000 + 5000
    expect(result.totalOutputTokens).toBe(350); // 0 + 150 + 200
    expect(result.totalCacheCreationTokens).toBe(500);
    expect(result.totalCacheReadTokens).toBe(800);
  });

  it('should track tool call counts', () => {
    const result = parseJsonlContent(SAMPLE_JSONL, 'test-session', 'test-project');

    expect(result.toolCallCounts['Read']).toBe(1);
  });

  it('should set start and end times', () => {
    const result = parseJsonlContent(SAMPLE_JSONL, 'test-session', 'test-project');

    expect(result.startTime).toBe('2026-03-01T10:00:00Z');
    expect(result.endTime).toBe('2026-03-01T10:00:10Z');
  });

  it('should handle empty content', () => {
    const result = parseJsonlContent('', 'empty', 'test');

    expect(result.messageCount).toBe(0);
    expect(result.totalInputTokens).toBe(0);
    expect(result.totalOutputTokens).toBe(0);
  });

  it('should handle malformed lines gracefully', () => {
    const content = 'not json\n' + JSON.stringify({
      message: {
        role: 'user',
        content: 'test',
        usage: { input_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 50 },
      },
    });

    const result = parseJsonlContent(content, 'test', 'test');
    expect(result.messageCount).toBe(1);
    expect(result.totalInputTokens).toBe(100);
  });
});

import type { SessionSummary, OptimizationSuggestion } from './types.js';

const CONTEXT_WINDOW_TOKENS = 200_000;
const LARGE_FILE_THRESHOLD_CHARS = 30_000; // ~7500 tokens

export function generateSuggestions(session: SessionSummary): readonly OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // Check context window utilization
  const contextUtilization = session.totalInputTokens / CONTEXT_WINDOW_TOKENS;
  if (contextUtilization > 0.8) {
    suggestions.push({
      type: 'context_size',
      severity: 'critical',
      message: `Context window at ${(contextUtilization * 100).toFixed(0)}% capacity. Consider using /compact.`,
      estimatedSavings: Math.floor(session.totalInputTokens * 0.3),
      details: `${session.totalInputTokens.toLocaleString()} input tokens used out of ~${CONTEXT_WINDOW_TOKENS.toLocaleString()} capacity.`,
    });
  } else if (contextUtilization > 0.6) {
    suggestions.push({
      type: 'context_size',
      severity: 'warning',
      message: `Context window at ${(contextUtilization * 100).toFixed(0)}%. Monitor growth.`,
      estimatedSavings: Math.floor(session.totalInputTokens * 0.15),
    });
  }

  // Check for large file reads
  const readCalls = session.messages.filter(
    (m) => m.toolCalls.some((tc) => tc.name === 'Read' || tc.name === 'read_file')
  );
  const largeReads = readCalls.filter((m) => m.contentLength > LARGE_FILE_THRESHOLD_CHARS);

  if (largeReads.length > 0) {
    suggestions.push({
      type: 'file_read',
      severity: 'warning',
      message: `${largeReads.length} large file read(s) detected. Use offset/limit to read only needed sections.`,
      estimatedSavings: largeReads.reduce((sum, m) => sum + Math.floor(m.contentLength / 4 * 0.7), 0),
      details: 'Reading entire large files wastes tokens. Target specific line ranges when possible.',
    });
  }

  // Check tool usage efficiency
  const toolEntries = Object.entries(session.toolCallCounts);
  const totalToolCalls = toolEntries.reduce((sum, [, count]) => sum + count, 0);

  if (totalToolCalls > 100) {
    suggestions.push({
      type: 'tool_usage',
      severity: 'info',
      message: `${totalToolCalls} tool calls in this session. Consider batching operations.`,
      details: 'Each tool call adds overhead to the context. Group related operations when possible.',
    });
  }

  // Check for repeated tool calls (same tool called many times)
  for (const [tool, count] of toolEntries) {
    if (count > 20) {
      suggestions.push({
        type: 'tool_usage',
        severity: 'info',
        message: `"${tool}" called ${count} times. Check for redundant calls.`,
        details: `Frequent use of "${tool}" may indicate repeated searches or reads that could be optimized.`,
      });
    }
  }

  // Check cache efficiency
  const totalInput = session.totalInputTokens;
  const cacheRead = session.totalCacheReadTokens;
  if (totalInput > 50_000 && cacheRead === 0) {
    suggestions.push({
      type: 'caching',
      severity: 'info',
      message: 'No cache hits detected. Prompt caching could save significant tokens.',
      estimatedSavings: Math.floor(totalInput * 0.5),
      details: 'If session has repeating context, prompt caching reduces costs by up to 90%.',
    });
  } else if (totalInput > 0 && cacheRead > 0) {
    const cacheHitRate = cacheRead / (totalInput + cacheRead);
    if (cacheHitRate > 0.3) {
      suggestions.push({
        type: 'caching',
        severity: 'info',
        message: `Good cache hit rate: ${(cacheHitRate * 100).toFixed(0)}%. Cache is working well.`,
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return suggestions;
}

export function calculatePotentialSavings(suggestions: readonly OptimizationSuggestion[]): number {
  return suggestions.reduce((sum, s) => sum + (s.estimatedSavings ?? 0), 0);
}

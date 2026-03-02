export interface TokenUsage {
  readonly input_tokens: number;
  readonly cache_creation_input_tokens: number;
  readonly cache_read_input_tokens: number;
  readonly output_tokens: number;
}

export interface ToolCall {
  readonly name: string;
  readonly input?: Record<string, unknown>;
}

export interface ParsedMessage {
  readonly role: 'user' | 'assistant' | 'system';
  readonly timestamp?: string;
  readonly usage?: TokenUsage;
  readonly toolCalls: readonly ToolCall[];
  readonly contentLength: number;
  readonly type?: string;
}

export interface SessionSummary {
  readonly sessionId: string;
  readonly projectPath: string;
  readonly messageCount: number;
  readonly messages: readonly ParsedMessage[];
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCacheCreationTokens: number;
  readonly totalCacheReadTokens: number;
  readonly toolCallCounts: Readonly<Record<string, number>>;
  readonly startTime?: string;
  readonly endTime?: string;
}

export interface TokenBreakdown {
  readonly category: string;
  readonly tokens: number;
  readonly percentage: number;
  readonly details?: string;
}

export interface TokenTrend {
  readonly messageIndex: number;
  readonly cumulativeInputTokens: number;
  readonly cumulativeOutputTokens: number;
  readonly role: string;
}

export interface TokenHog {
  readonly name: string;
  readonly type: 'tool' | 'file' | 'conversation';
  readonly estimatedTokens: number;
  readonly occurrences: number;
}

export interface SessionAnalysis {
  readonly sessionId: string;
  readonly breakdown: readonly TokenBreakdown[];
  readonly trends: readonly TokenTrend[];
  readonly tokenHogs: readonly TokenHog[];
  readonly totalTokens: number;
  readonly estimatedCostUsd: number;
}

export interface Instinct {
  readonly id: string;
  readonly pattern: string;
  readonly description: string;
  readonly confidence: number;
  readonly occurrences: number;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly projectPath?: string;
  readonly tags: readonly string[];
}

export interface Mistake {
  readonly id: string;
  readonly action: string;
  readonly error: string;
  readonly solution: string;
  readonly timestamp: string;
  readonly projectPath?: string;
  readonly occurrences: number;
  readonly tags: readonly string[];
}

export interface Facet {
  readonly goal?: string;
  readonly outcome?: string;
  readonly friction?: string;
  readonly satisfaction?: number;
}

export interface OptimizationSuggestion {
  readonly type: 'skills' | 'file_read' | 'context_size' | 'tool_usage' | 'caching';
  readonly severity: 'info' | 'warning' | 'critical';
  readonly message: string;
  readonly estimatedSavings?: number;
  readonly details?: string;
}

export interface CostEntry {
  readonly date: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
  readonly estimatedCostUsd: number;
  readonly sessionCount: number;
}

export interface SessionMeta {
  readonly sessionId: string;
  readonly duration?: number;
  readonly totalTokens?: number;
  readonly toolCounts?: Readonly<Record<string, number>>;
  readonly errors?: number;
  readonly timestamp?: string;
}

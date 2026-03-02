// Session Parser
export {
  parseJsonlContent,
  parseSessionFile,
  listProjects,
  listSessions,
  loadSession,
  loadAllSessions,
  findLatestSession,
} from './session-parser.js';

// Token Analyzer
export {
  analyzeSession,
  analyzeSessions,
  calculateCost,
  estimateTokens,
} from './token-analyzer.js';

// Learning Engine
export {
  loadInstincts,
  saveInstinct,
  createInstinct,
  reinforceInstinct,
  loadMistakes,
  saveMistake,
  recordMistake,
  loadFacets,
  analyzeFriction,
  extractPatterns,
} from './learning-engine.js';
export type { FrictionAnalysis, ExtractedPattern } from './learning-engine.js';

// Optimizer
export {
  generateSuggestions,
  calculatePotentialSavings,
} from './optimizer.js';

// Cost Calculator
export {
  computeDailyCosts,
  computeWeeklyCosts,
  computeMonthlyCosts,
} from './cost-calculator.js';

// Filter Engine
export {
  loadFilterConfig,
  saveFilterConfig,
  loadOutputStats,
  findMatchingRule,
  applyFilter,
  recordOutput,
  autoGenerateRules,
  updateRuleStats,
} from './filter-engine.js';
export type { FilterRule, OutputStat, FilterConfig } from './filter-engine.js';

// Types
export type {
  TokenUsage,
  ToolCall,
  ParsedMessage,
  SessionSummary,
  TokenBreakdown,
  TokenTrend,
  TokenHog,
  SessionAnalysis,
  Instinct,
  Mistake,
  Facet,
  OptimizationSuggestion,
  CostEntry,
  SessionMeta,
} from './types.js';

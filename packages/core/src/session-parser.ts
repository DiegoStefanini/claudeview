import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import type { ParsedMessage, SessionSummary, TokenUsage, ToolCall } from './types.js';

const CLAUDE_DIR = join(homedir(), '.claude');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

interface RawJsonlEntry {
  readonly type?: string;
  readonly message?: {
    readonly role?: string;
    readonly content?: unknown;
    readonly usage?: TokenUsage;
  };
  readonly timestamp?: string;
  readonly tool_calls?: readonly RawToolCall[];
  readonly toolName?: string;
  readonly toolInput?: Record<string, unknown>;
}

interface RawToolCall {
  readonly name: string;
  readonly input?: Record<string, unknown>;
}

function parseToolCalls(entry: RawJsonlEntry): readonly ToolCall[] {
  const calls: ToolCall[] = [];

  if (entry.tool_calls) {
    for (const tc of entry.tool_calls) {
      calls.push({ name: tc.name, input: tc.input });
    }
  }

  if (entry.toolName) {
    calls.push({ name: entry.toolName, input: entry.toolInput });
  }

  return calls;
}

function estimateContentLength(content: unknown): number {
  if (typeof content === 'string') return content.length;
  if (Array.isArray(content)) {
    return content.reduce((sum, item) => {
      if (typeof item === 'string') return sum + item.length;
      if (item && typeof item === 'object' && 'text' in item) {
        return sum + String(item.text).length;
      }
      return sum + JSON.stringify(item).length;
    }, 0);
  }
  if (content && typeof content === 'object') {
    return JSON.stringify(content).length;
  }
  return 0;
}

function parseJsonlLine(line: string): RawJsonlEntry | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  try {
    return JSON.parse(trimmed) as RawJsonlEntry;
  } catch {
    return null;
  }
}

function parseMessage(entry: RawJsonlEntry): ParsedMessage {
  const role = (entry.message?.role ?? 'system') as ParsedMessage['role'];
  const usage = entry.message?.usage;
  const toolCalls = parseToolCalls(entry);
  const contentLength = estimateContentLength(entry.message?.content);

  return {
    role,
    timestamp: entry.timestamp,
    usage: usage ? { ...usage } : undefined,
    toolCalls,
    contentLength,
    type: entry.type,
  };
}

export function parseJsonlContent(content: string, sessionId: string, projectPath: string): SessionSummary {
  const lines = content.split('\n');
  const messages: ParsedMessage[] = [];
  const toolCallCounts: Record<string, number> = {};

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalCacheReadTokens = 0;
  let startTime: string | undefined;
  let endTime: string | undefined;

  for (const line of lines) {
    const entry = parseJsonlLine(line);
    if (!entry) continue;

    const message = parseMessage(entry);
    messages.push(message);

    if (message.usage) {
      totalInputTokens += message.usage.input_tokens;
      totalOutputTokens += message.usage.output_tokens;
      totalCacheCreationTokens += message.usage.cache_creation_input_tokens;
      totalCacheReadTokens += message.usage.cache_read_input_tokens;
    }

    for (const tc of message.toolCalls) {
      toolCallCounts[tc.name] = (toolCallCounts[tc.name] ?? 0) + 1;
    }

    if (message.timestamp) {
      if (!startTime) startTime = message.timestamp;
      endTime = message.timestamp;
    }
  }

  return {
    sessionId,
    projectPath,
    messageCount: messages.length,
    messages,
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreationTokens,
    totalCacheReadTokens,
    toolCallCounts,
    startTime,
    endTime,
  };
}

export async function parseSessionFile(filePath: string, projectPath: string): Promise<SessionSummary> {
  const content = await readFile(filePath, 'utf-8');
  const sessionId = basename(filePath, '.jsonl');
  return parseJsonlContent(content, sessionId, projectPath);
}

export async function listProjects(): Promise<readonly string[]> {
  try {
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export async function listSessions(projectName: string): Promise<readonly string[]> {
  const projectDir = join(PROJECTS_DIR, projectName);
  try {
    const entries = await readdir(projectDir);
    return entries
      .filter((e) => e.endsWith('.jsonl'))
      .map((e) => basename(e, '.jsonl'));
  } catch {
    return [];
  }
}

export async function loadSession(projectName: string, sessionId: string): Promise<SessionSummary> {
  const filePath = join(PROJECTS_DIR, projectName, `${sessionId}.jsonl`);
  return parseSessionFile(filePath, projectName);
}

export async function loadAllSessions(projectName: string): Promise<readonly SessionSummary[]> {
  const sessionIds = await listSessions(projectName);
  const sessions = await Promise.all(
    sessionIds.map((id) => loadSession(projectName, id))
  );
  return sessions;
}

export async function findLatestSession(): Promise<SessionSummary | null> {
  const projects = await listProjects();
  let latest: { summary: SessionSummary; mtime: number } | null = null;

  for (const project of projects) {
    const projectDir = join(PROJECTS_DIR, project);
    try {
      const entries = await readdir(projectDir, { withFileTypes: true });
      const jsonlFiles = entries.filter((e) => e.name.endsWith('.jsonl'));

      for (const file of jsonlFiles) {
        const filePath = join(projectDir, file.name);
        const { statSync } = await import('node:fs');
        const stat = statSync(filePath);
        const mtime = stat.mtimeMs;

        if (!latest || mtime > latest.mtime) {
          const summary = await parseSessionFile(filePath, project);
          latest = { summary, mtime };
        }
      }
    } catch {
      continue;
    }
  }

  return latest?.summary ?? null;
}

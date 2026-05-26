export interface ApiError {
  kind: 'api-error';
  code: string;
  message: string;
  detail?: unknown;
}

export function isApiError(v: unknown): v is ApiError {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { kind?: unknown }).kind === 'api-error' &&
    typeof (v as { code?: unknown }).code === 'string' &&
    typeof (v as { message?: unknown }).message === 'string'
  );
}

export interface ConfigDto {
  provider: { mode: 'claude-code' | 'anthropic-api'; anthropicApiKey?: string };
  models: { default: string; heavy: string };
  calendar: { urls: Array<{ label: string; url: string }>; pollIntervalMinutes: number };
  search: { tavilyApiKey: string };
  indexing: { chunkSizeTokens: number; chunkOverlapTokens: number; embeddingModel: string };
  ingestion: { contextualRetrieval: boolean };
  ui: { theme: 'auto' | 'light' | 'dark'; mascot: 'chatty' | 'quiet' | 'off' };
  chat: { autoClearThreshold: number; autoClearIdleMinutes: number };
}

export interface ProviderTestResult {
  ok: boolean;
  reason?: string;
}

export type ClaudeCliOs = 'darwin' | 'linux' | 'win32';

export interface ClaudeCliCheckResult {
  installed: boolean;
  os: ClaudeCliOs;
  version?: string;
  path?: string;
  reason?: string;
}

export interface VaultValidateResult {
  ok: boolean;
  noteCount: number;
  hasExisting: boolean;     // .sanji/ already exists?
  reason?: string;
}

export interface NoteSummary {
  path: string;
  title: string | null;
  mtimeMs: number;
}

export type IndexingStatusEvent =
  | { kind: 'progress'; notesIndexed: number; notesTotal: number }
  | { kind: 'done'; notesIndexed: number }
  | { kind: 'error'; message: string };

export interface OnboardingInitRequest {
  vault: string;
  config: ConfigDto;
}

import type { ChatMessage } from './llm.js';

export interface ChatRequest {
  /**
   * Full conversation history. The last entry must be the latest user
   * message; prior entries are previous user/assistant turns. The backend
   * is stateless: the frontend owns history and posts the whole array on
   * every send. Token-budget-aware truncation is a v0.2 concern; for v0.1
   * full history is acceptable for typical study-buddy session lengths.
   */
  messages: ChatMessage[];
  model?: string;
}

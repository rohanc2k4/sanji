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
  ui: { theme: 'auto' | 'light' | 'dark'; mascot: 'chatty' | 'quiet' | 'off' };
}

export interface ProviderTestResult {
  ok: boolean;
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

export interface ChatRequest {
  message: string;
  model?: string;
}

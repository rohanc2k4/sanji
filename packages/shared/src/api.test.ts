import { describe, expect, it } from 'vitest';
import type {
  ApiError,
  ConfigDto,
  ProviderTestResult,
  VaultValidateResult,
  NoteSummary,
  IndexingStatusEvent,
} from './api.js';
import { isApiError } from './api.js';

describe('api types', () => {
  it('isApiError narrows on tagged objects', () => {
    const e: unknown = { kind: 'api-error', code: 'NOT_FOUND', message: 'gone' };
    expect(isApiError(e)).toBe(true);
    expect(isApiError({})).toBe(false);
    expect(isApiError(null)).toBe(false);
  });

  it('ConfigDto matches the .sanji/config.toml shape used by the backend', () => {
    const cfg: ConfigDto = {
      provider: { mode: 'claude-code' },
      models: { default: 'claude-sonnet-4-6', heavy: 'claude-opus-4-7' },
      calendar: { urls: [], pollIntervalMinutes: 5 },
      search: { tavilyApiKey: '' },
      indexing: { chunkSizeTokens: 500, chunkOverlapTokens: 50, embeddingModel: 'Xenova/all-MiniLM-L6-v2' },
      ingestion: { contextualRetrieval: false },
      ui: { theme: 'auto', mascot: 'chatty' },
      chat: { autoClearThreshold: 0.75, autoClearIdleMinutes: 30 },
    };
    expect(cfg.provider.mode).toBe('claude-code');
  });

  it('result types compose', () => {
    const ok: ProviderTestResult = { ok: true };
    const fail: ProviderTestResult = { ok: false, reason: 'rate limit' };
    const validate: VaultValidateResult = { ok: true, noteCount: 42, hasExisting: false };
    const note: NoteSummary = { path: 'daily/2026-04-27.md', title: '2026-04-27', mtimeMs: Date.now() };
    const status: IndexingStatusEvent = { kind: 'progress', notesIndexed: 10, notesTotal: 100 };
    expect([ok, fail, validate, note, status].length).toBe(5);
  });
});

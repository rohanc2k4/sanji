import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeServer } from './server.js';

let dir: string;
const PRIOR_FAKE_EMBED = process.env.SANJI_FAKE_EMBED;
const PRIOR_OFFLINE = process.env.SANJI_OFFLINE_FAKE_LLM;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sanji-swap-'));
  mkdirSync(join(dir, 'daily'));
  writeFileSync(
    join(dir, 'daily/2026-05-04.md'),
    '---\ntitle: Today\n---\nfirst note',
  );
  writeFileSync(join(dir, 'inbox.md'), '---\ntitle: Inbox\n---\nroot file');
  // Force the embedder + adapter to fast offline stubs so the test stays
  // self-contained (no MiniLM model download, no Anthropic call).
  process.env.SANJI_FAKE_EMBED = '1';
  process.env.SANJI_OFFLINE_FAKE_LLM = '1';
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (PRIOR_FAKE_EMBED === undefined) delete process.env.SANJI_FAKE_EMBED;
  else process.env.SANJI_FAKE_EMBED = PRIOR_FAKE_EMBED;
  if (PRIOR_OFFLINE === undefined) delete process.env.SANJI_OFFLINE_FAKE_LLM;
  else process.env.SANJI_OFFLINE_FAKE_LLM = PRIOR_OFFLINE;
});

const sampleConfig = {
  provider: { mode: 'claude-code' as const },
  models: { default: 'claude-sonnet-4-6', heavy: 'claude-opus-4-7' },
  calendar: { urls: [], pollIntervalMinutes: 5 },
  search: { tavilyApiKey: '' },
  indexing: {
    chunkSizeTokens: 500,
    chunkOverlapTokens: 50,
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  },
  ingestion: { contextualRetrieval: false },
  ui: { theme: 'auto' as const, mascot: 'chatty' as const },
};

describe('makeServer runtime swap', () => {
  it('flips from no-vault to ready after POST /api/onboarding/init', async () => {
    const handle = makeServer({ kind: 'no-vault' });

    // Pre-init: /api/config should not be mounted (kind:'no-vault').
    const before = await handle.app.request('/api/config');
    expect(before.status).toBe(404);

    // Init writes the config + bootstraps ready deps + swaps the routes.
    const initRes = await handle.app.request('/api/onboarding/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vault: dir, config: sampleConfig }),
    });
    expect(initRes.status).toBe(200);
    expect(handle.current().kind).toBe('ready');

    // Post-init: /api/config now serves the saved config.
    const after = await handle.app.request('/api/config');
    expect(after.status).toBe(200);
    const cfg = (await after.json()) as { provider: { mode: string } };
    expect(cfg.provider.mode).toBe('claude-code');

    // /api/vault/notes is also live now (empty list because indexing hasn't
    // been triggered yet — the test only verifies the route is mounted).
    const vault = await handle.app.request('/api/vault/notes');
    expect(vault.status).toBe(200);
  });
});

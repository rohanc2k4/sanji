import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeServer } from '../server.js';

let dir: string;
const PRIOR_FAKE_EMBED = process.env.SANJI_FAKE_EMBED;
const PRIOR_OFFLINE = process.env.SANJI_OFFLINE_FAKE_LLM;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sanji-folders-swap-'));
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

async function bootstrap() {
  const handle = makeServer({ kind: 'no-vault' });
  const initRes = await handle.app.request('/api/onboarding/init', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ vault: dir, config: sampleConfig }),
  });
  expect(initRes.status).toBe(200);
  return handle;
}

describe('folders route integration via makeServer', () => {
  it('end-to-end POST /api/notes via the live server (smoke)', async () => {
    const handle = await bootstrap();
    const res = await handle.app.request('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'fresh.md' }),
    });
    expect(res.status).toBe(200);
    expect(existsSync(join(dir, 'fresh.md'))).toBe(true);
  });

  it('end-to-end POST /api/folders/move via the live server', async () => {
    mkdirSync(join(dir, 'inbox'), { recursive: true });
    writeFileSync(join(dir, 'inbox/note.md'), '---\ntitle: Note\n---\nbody');
    const handle = await bootstrap();
    const res = await handle.app.request('/api/folders/move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'inbox', to: 'archive' }),
    });
    expect(res.status).toBe(200);
    expect(existsSync(join(dir, 'archive/note.md'))).toBe(true);
    expect(existsSync(join(dir, 'inbox'))).toBe(false);
  });

  it('end-to-end DELETE /api/folders/* via the live server', async () => {
    mkdirSync(join(dir, 'trashme'), { recursive: true });
    writeFileSync(join(dir, 'trashme/a.md'), 'body');
    const handle = await bootstrap();
    const res = await handle.app.request('/api/folders/trashme', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(existsSync(join(dir, '.sanji/trash/trashme/a.md'))).toBe(true);
  });
});

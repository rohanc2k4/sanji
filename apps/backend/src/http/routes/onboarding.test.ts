import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onboardingRoute } from './onboarding.js';
import { resolveVaultPaths } from '../../config/paths.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sanji-onb-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function mountApp() {
  const app = new Hono();
  app.route('/', onboardingRoute());
  return app;
}

describe('onboarding route', () => {
  it('validate-vault counts md files and detects existing .sanji/', async () => {
    writeFileSync(join(dir, 'a.md'), '# a');
    writeFileSync(join(dir, 'b.md'), '# b');
    mkdirSync(join(dir, '.sanji'));
    const app = mountApp();
    const res = await app.request('/api/onboarding/validate-vault', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vault: dir }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; noteCount: number; hasExisting: boolean };
    expect(body.ok).toBe(true);
    expect(body.noteCount).toBe(2);
    expect(body.hasExisting).toBe(true);
  });

  it('validate-vault rejects nonexistent path', async () => {
    const app = mountApp();
    const res = await app.request('/api/onboarding/validate-vault', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vault: '/this/does/not/exist' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBeTruthy();
  });

  it('init creates .sanji/, writes config, runs migrations, returns config', async () => {
    const app = mountApp();
    const res = await app.request('/api/onboarding/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vault: dir,
        config: {
          provider: { mode: 'claude-code' },
          models: { default: 'claude-sonnet-4-6', heavy: 'claude-opus-4-7' },
          calendar: { urls: [], pollIntervalMinutes: 5 },
          search: { tavilyApiKey: '' },
          indexing: {
            chunkSizeTokens: 500,
            chunkOverlapTokens: 50,
            embeddingModel: 'Xenova/all-MiniLM-L6-v2',
          },
          ingestion: { contextualRetrieval: false },
          ui: { theme: 'auto', mascot: 'chatty' },
        },
      }),
    });
    expect(res.status).toBe(200);
    const paths = resolveVaultPaths(dir);
    expect(existsSync(paths.configFile)).toBe(true);
    expect(existsSync(paths.indexDb)).toBe(true);
  });

  it('POST /api/onboarding/check-claude-cli returns the probe result', async () => {
    const app = mountApp();
    const res = await app.request('/api/onboarding/check-claude-cli', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { installed: boolean; os: string };
    // We can't assert on installed=true/false in a unit test (depends on the
    // host machine), but the shape is contract-stable.
    expect(typeof body.installed).toBe('boolean');
    expect(['darwin', 'linux', 'win32']).toContain(body.os);
  });
});

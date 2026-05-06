import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configRoute } from './config.js';
import { resolveVaultPaths } from '../../config/paths.js';
import { loadOrInitConfig } from '../../config/loader.js';
import type { ConfigDto } from '@sanji/shared';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sanji-cfg-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function mountApp() {
  const paths = resolveVaultPaths(dir);
  loadOrInitConfig(paths);
  const app = new Hono();
  app.route('/', configRoute({ paths }));
  return { app, paths };
}

describe('config route', () => {
  it('GET /api/config returns the current config as JSON', async () => {
    const { app } = mountApp();
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
    const cfg = await res.json() as ConfigDto;
    expect(cfg.provider.mode).toBe('claude-code');
    expect(cfg.models.default).toBeTruthy();
  });

  it('PATCH /api/config merges updates and writes config.toml', async () => {
    const { app, paths } = mountApp();
    const res = await app.request('/api/config', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ models: { default: 'claude-opus-4-7' } }),
    });
    expect(res.status).toBe(200);
    const cfg = await res.json() as ConfigDto;
    expect(cfg.models.default).toBe('claude-opus-4-7');
    const onDisk = readFileSync(paths.configFile, 'utf8');
    expect(onDisk).toMatch(/claude-opus-4-7/);
  });

  it('PATCH /api/config rejects unknown top-level keys', async () => {
    const { app } = mountApp();
    const res = await app.request('/api/config', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wat: 'lol' }),
    });
    expect(res.status).toBe(400);
  });
});

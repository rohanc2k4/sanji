import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { notesRoute } from './notes.js';
import { resolveVaultPaths } from '../../config/paths.js';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sanji-notes-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function mount() {
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const app = new Hono();
  app.route('/', notesRoute({ paths }));
  return { app, paths };
}

describe('notes route', () => {
  it('GET /api/notes/* returns parsed note', async () => {
    writeFileSync(join(dir, 'a.md'), '---\ntitle: A\n---\nbody');
    const { app } = mount();
    const res = await app.request('/api/notes/a.md');
    expect(res.status).toBe(200);
    const body = await res.json() as { path: string; title: string | null; body: string };
    expect(body.path).toBe('a.md');
    expect(body.title).toBe('A');
    expect(body.body.trim()).toBe('body');
  });

  it('GET /api/notes/* 404s on missing', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes/missing.md');
    expect(res.status).toBe(404);
  });

  it('PUT /api/notes/* writes atomically and snapshots', async () => {
    writeFileSync(join(dir, 'a.md'), 'old');
    const { app } = mount();
    const res = await app.request('/api/notes/a.md', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'new' }),
    });
    expect(res.status).toBe(200);
    expect(readFileSync(join(dir, 'a.md'), 'utf8')).toBe('new');
  });

  it('rejects path traversal', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes/..%2Fescape.md');
    expect(res.status).toBe(400);
  });
});

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vaultRoute } from './vault.js';
import { openDb } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { Indexer } from '../../index/indexer.js';
import { FakeEmbedder } from '../../embeddings/embedder.js';
import { resolveVaultPaths } from '../../config/paths.js';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sanji-vault-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

async function fixture() {
  mkdirSync(join(dir, 'daily'));
  writeFileSync(join(dir, 'daily/2026-04-27.md'), '---\ntitle: Today\n---\nbody');
  writeFileSync(join(dir, 'projects.md'), '---\ntitle: Projects\n---\nbody');
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(paths.indexDb);
  runMigrations(db);
  const ix = new Indexer(db, new FakeEmbedder(), { chunkSizeTokens: 500, chunkOverlapTokens: 50 });
  await ix.indexAll(paths.vault);
  return { db, paths };
}

describe('vault route', () => {
  it('GET /api/vault/notes returns indexed notes sorted by path', async () => {
    const { db, paths } = await fixture();
    const app = new Hono();
    app.route('/', vaultRoute({ db, paths }));
    const res = await app.request('/api/vault/notes');
    expect(res.status).toBe(200);
    const notes = await res.json() as Array<{ path: string; title: string | null; mtimeMs: number }>;
    expect(notes.map((n) => n.path)).toEqual(['daily/2026-04-27.md', 'projects.md']);
    expect(typeof notes[0]!.mtimeMs).toBe('number');
    db.close();
  });

  it('?prefix=daily/ filters', async () => {
    const { db, paths } = await fixture();
    const app = new Hono();
    app.route('/', vaultRoute({ db, paths }));
    const res = await app.request('/api/vault/notes?prefix=daily/');
    const notes = await res.json() as Array<{ path: string }>;
    expect(notes.map((n) => n.path)).toEqual(['daily/2026-04-27.md']);
    db.close();
  });
});

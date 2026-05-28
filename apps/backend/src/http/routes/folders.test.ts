import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { foldersRoute } from './folders.js';
import { resolveVaultPaths } from '../../config/paths.js';
import { openDb } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { FakeEmbedder } from '../../embeddings/embedder.js';
import { Indexer } from '../../index/indexer.js';
import { IndexRepo } from '../../index/repo.js';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sanji-folders-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function mount(opts?: { withIndexer?: boolean }) {
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(':memory:');
  runMigrations(db);
  const repo = new IndexRepo(db);
  const embedder = new FakeEmbedder();
  const indexer = opts?.withIndexer
    ? new Indexer(db, embedder, { chunkSizeTokens: 500, chunkOverlapTokens: 50 })
    : undefined;
  const app = new Hono();
  app.route('/', foldersRoute({ paths, repo, ...(indexer ? { indexer } : {}) }));
  return { app, paths, repo, indexer };
}

describe('POST /api/folders/move', () => {
  it('moves a directory and rewrites repo entries for contained notes', async () => {
    mkdirSync(join(dir, 'inbox'), { recursive: true });
    writeFileSync(join(dir, 'inbox/a.md'), '---\ntitle: A\n---\nbody-a');
    writeFileSync(join(dir, 'inbox/b.md'), '---\ntitle: B\n---\nbody-b');
    const { app, repo, indexer } = mount({ withIndexer: true });
    await indexer!.indexFile(dir, 'inbox/a.md');
    await indexer!.indexFile(dir, 'inbox/b.md');
    const res = await app.request('/api/folders/move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'inbox', to: 'archive' }),
    });
    expect(res.status).toBe(200);
    expect(existsSync(join(dir, 'inbox'))).toBe(false);
    expect(existsSync(join(dir, 'archive/a.md'))).toBe(true);
    expect(existsSync(join(dir, 'archive/b.md'))).toBe(true);
    expect(repo.getNote('inbox/a.md')).toBeNull();
    expect(repo.getNote('archive/a.md')).not.toBeNull();
    expect(repo.getNote('archive/b.md')).not.toBeNull();
  });

  it('returns 409 if target already exists', async () => {
    mkdirSync(join(dir, 'a'), { recursive: true });
    mkdirSync(join(dir, 'b'), { recursive: true });
    const { app } = mount();
    const res = await app.request('/api/folders/move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'a', to: 'b' }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 if to equals from', async () => {
    mkdirSync(join(dir, 'a'), { recursive: true });
    const { app } = mount();
    const res = await app.request('/api/folders/move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'a', to: 'a' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 if to is a descendant of from', async () => {
    mkdirSync(join(dir, 'a'), { recursive: true });
    const { app } = mount();
    const res = await app.request('/api/folders/move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'a', to: 'a/sub' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 if source does not exist', async () => {
    const { app } = mount();
    const res = await app.request('/api/folders/move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'nope', to: 'fine' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/folders/*', () => {
  it('moves the whole subtree to .sanji/trash/<rel-path>', async () => {
    mkdirSync(join(dir, 'archive/2025'), { recursive: true });
    writeFileSync(join(dir, 'archive/2025/a.md'), 'a');
    writeFileSync(join(dir, 'archive/2025/b.md'), 'b');
    const { app, paths } = mount();
    const res = await app.request('/api/folders/archive', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(existsSync(join(dir, 'archive'))).toBe(false);
    expect(existsSync(join(paths.sanjiDir, 'trash/archive/2025/a.md'))).toBe(true);
    expect(existsSync(join(paths.sanjiDir, 'trash/archive/2025/b.md'))).toBe(true);
  });

  it('purges every contained note from the repo', async () => {
    mkdirSync(join(dir, 'box'), { recursive: true });
    writeFileSync(join(dir, 'box/a.md'), '---\ntitle: A\n---\nbody');
    writeFileSync(join(dir, 'box/b.md'), '---\ntitle: B\n---\nbody');
    const { app, repo, indexer } = mount({ withIndexer: true });
    await indexer!.indexFile(dir, 'box/a.md');
    await indexer!.indexFile(dir, 'box/b.md');
    expect(repo.getNote('box/a.md')).not.toBeNull();
    await app.request('/api/folders/box', { method: 'DELETE' });
    expect(repo.getNote('box/a.md')).toBeNull();
    expect(repo.getNote('box/b.md')).toBeNull();
  });

  it('suffixes trash path with .timestamp on collision', async () => {
    mkdirSync(join(dir, 'x'), { recursive: true });
    const { app, paths } = mount();
    await app.request('/api/folders/x', { method: 'DELETE' });
    mkdirSync(join(dir, 'x'), { recursive: true });
    const res = await app.request('/api/folders/x', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const trashed = readdirSync(join(paths.sanjiDir, 'trash')).filter((n) => n.startsWith('x'));
    expect(trashed.length).toBe(2);
  });

  it('returns 404 on missing folder', async () => {
    const { app } = mount();
    const res = await app.request('/api/folders/nope', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

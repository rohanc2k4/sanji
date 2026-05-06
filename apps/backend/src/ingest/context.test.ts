import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { Indexer } from '../index/indexer.js';
import { FakeEmbedder } from '../embeddings/embedder.js';
import { resolveVaultPaths } from '../config/paths.js';
import { IndexRepo } from '../index/repo.js';
import { buildVaultContext } from './context.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sanji-context-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

async function fixture() {
  mkdirSync(join(dir, 'daily'));
  writeFileSync(
    join(dir, 'daily/2026-04-27.md'),
    '---\ntitle: Today\nsummary: A short summary line.\n---\nbody paragraph here',
  );
  writeFileSync(
    join(dir, 'no-summary.md'),
    '---\ntitle: NoSummary\n---\nFirst paragraph that should be the fallback summary. It is a couple of sentences long for the test.',
  );
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(paths.indexDb);
  runMigrations(db);
  const ix = new Indexer(db, new FakeEmbedder(), { chunkSizeTokens: 500, chunkOverlapTokens: 50 });
  await ix.indexAll(paths.vault);
  return { db, repo: new IndexRepo(db) };
}

describe('buildVaultContext', () => {
  it('returns title + summary from frontmatter when present', async () => {
    const { db, repo } = await fixture();
    const ctx = await buildVaultContext(repo);
    const today = ctx.notes.find((n) => n.path === 'daily/2026-04-27.md');
    expect(today?.title).toBe('Today');
    expect(today?.summary).toBe('A short summary line.');
    db.close();
  });

  it('falls back to first paragraph (truncated to 200 chars) when summary missing', async () => {
    const { db, repo } = await fixture();
    const ctx = await buildVaultContext(repo);
    const ns = ctx.notes.find((n) => n.path === 'no-summary.md');
    expect(ns?.title).toBe('NoSummary');
    expect(ns?.summary).toMatch(/^First paragraph/);
    expect((ns?.summary ?? '').length).toBeLessThanOrEqual(200);
    db.close();
  });
});

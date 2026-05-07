import { describe, expect, it, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { IndexRepo } from '../index/repo.js';
import { resolveVaultPaths } from '../config/paths.js';
import { FakeEmbedder } from '../embeddings/embedder.js';
import { hybridSearchTool } from './hybrid-search.js';
import type { ToolContext } from './types.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

async function setup() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  const repo = new IndexRepo(db);
  const embedder = new FakeEmbedder();
  const ctx: ToolContext = {
    paths: resolveVaultPaths(dir),
    db,
    repo,
    embedder,
  };
  return { ctx, repo, embedder };
}

async function seedNote(
  repo: IndexRepo,
  embedder: FakeEmbedder,
  path: string,
  body: string,
  chunks: Array<{ text: string; headerTrail?: string[] }>,
) {
  repo.upsertNote({ path, mtimeMs: 1, body, frontmatter: null, title: null });
  let cursor = 0;
  const upserts = [] as Array<{
    chunkIndex: number;
    text: string;
    startChar: number;
    endChar: number;
    embedding: Float32Array;
    headerTrail?: string[];
  }>;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const start = cursor;
    const end = cursor + c.text.length;
    cursor = end + 1;
    upserts.push({
      chunkIndex: i,
      text: c.text,
      startChar: start,
      endChar: end,
      embedding: await embedder.embed(c.text),
      headerTrail: c.headerTrail,
    });
  }
  repo.replaceChunksForNote(path, upserts);
}

describe('hybridSearchTool', () => {
  it('returns [] on empty corpus', async () => {
    const { ctx } = await setup();
    const out = await hybridSearchTool.run({ query: 'argocd' }, ctx);
    expect(JSON.parse(out)).toEqual([]);
  });

  it('returns fused results with required fields', async () => {
    const { ctx, repo, embedder } = await setup();
    await seedNote(repo, embedder, 'a.md', 'alpha bravo body', [
      { text: 'alpha bravo content', headerTrail: ['Top'] },
    ]);
    const out = await hybridSearchTool.run({ query: 'alpha bravo' }, ctx);
    const hits = JSON.parse(out) as Array<Record<string, unknown>>;
    expect(hits.length).toBeGreaterThan(0);
    const hit = hits[0]!;
    expect(hit).toHaveProperty('path');
    expect(hit).toHaveProperty('chunkIndex');
    expect(hit).toHaveProperty('text');
    expect(hit).toHaveProperty('headerTrail');
    expect(hit).toHaveProperty('fusedScore');
  });

  it('a note ranking high in both FTS and dense scores higher than one ranking high in only one', async () => {
    const { ctx, repo, embedder } = await setup();
    // 'both.md' contains the query terms verbatim and is dense-similar.
    await seedNote(repo, embedder, 'both.md', 'argocd policy server pipeline', [
      { text: 'argocd policy server pipeline' },
    ]);
    // 'fts-only.md' contains query terms (FTS hit) but its chunk text is unrelated for dense.
    await seedNote(repo, embedder, 'fts-only.md', 'argocd policy server elsewhere', [
      { text: 'completely different topic about cooking' },
    ]);
    // 'dense-only.md' lacks the query terms but its chunk is dense-similar.
    await seedNote(repo, embedder, 'dense-only.md', 'unrelated body', [
      { text: 'argocd policy server pipeline' },
    ]);
    const out = await hybridSearchTool.run({ query: 'argocd policy server' }, ctx);
    const hits = JSON.parse(out) as Array<{ path: string; fusedScore: number }>;
    const both = hits.find((h) => h.path === 'both.md');
    const ftsOnly = hits.find((h) => h.path === 'fts-only.md');
    const denseOnly = hits.find((h) => h.path === 'dense-only.md');
    expect(both).toBeDefined();
    if (ftsOnly) expect(both!.fusedScore).toBeGreaterThanOrEqual(ftsOnly.fusedScore);
    if (denseOnly) expect(both!.fusedScore).toBeGreaterThanOrEqual(denseOnly.fusedScore);
  });

  it('honors limit (default 5, max 25)', async () => {
    const { ctx, repo, embedder } = await setup();
    for (let i = 0; i < 30; i++) {
      await seedNote(repo, embedder, `n${i}.md`, `fizz buzz ${i}`, [{ text: `fizz buzz ${i}` }]);
    }
    const def = JSON.parse(await hybridSearchTool.run({ query: 'fizz' }, ctx));
    expect(def.length).toBe(5);
    const capped = JSON.parse(await hybridSearchTool.run({ query: 'fizz', limit: 999 }, ctx));
    expect(capped.length).toBe(25);
    const explicit = JSON.parse(await hybridSearchTool.run({ query: 'fizz', limit: 3 }, ctx));
    expect(explicit.length).toBe(3);
  });

  it('throws on empty/missing query', async () => {
    const { ctx } = await setup();
    await expect(hybridSearchTool.run({ query: '' }, ctx)).rejects.toThrow(/query/);
    await expect(hybridSearchTool.run({}, ctx)).rejects.toThrow(/query/);
    await expect(
      hybridSearchTool.run({ query: 5 as unknown as string }, ctx),
    ).rejects.toThrow(/query/);
  });
});

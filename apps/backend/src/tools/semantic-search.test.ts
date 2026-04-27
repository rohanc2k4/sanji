import { describe, expect, it, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { IndexRepo } from '../index/repo.js';
import { resolveVaultPaths } from '../config/paths.js';
import { FakeEmbedder } from '../embeddings/embedder.js';
import { semanticSearchTool } from './semantic-search.js';
import type { ToolContext } from './types.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

async function setup() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  const repo = new IndexRepo(db);
  const embedder = new FakeEmbedder();

  repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
  repo.replaceChunksForNote('a.md', [
    {
      chunkIndex: 0,
      text: 'alpha bravo',
      startChar: 0,
      endChar: 11,
      embedding: await embedder.embed('alpha bravo'),
    },
    {
      chunkIndex: 1,
      text: 'omega charlie',
      startChar: 12,
      endChar: 25,
      embedding: await embedder.embed('omega charlie'),
    },
    {
      chunkIndex: 2,
      text: 'delta echo',
      startChar: 26,
      endChar: 36,
      embedding: await embedder.embed('delta echo'),
    },
  ]);

  const ctx: ToolContext = {
    paths: resolveVaultPaths(dir),
    db,
    repo,
    embedder,
  };
  return { ctx };
}

describe('semanticSearchTool', () => {
  it('returns nearest-neighbor chunks ranked by distance', async () => {
    const { ctx } = await setup();
    const out = await semanticSearchTool.run({ query: 'alpha bravo' }, ctx);
    const hits = JSON.parse(out);
    expect(Array.isArray(hits)).toBe(true);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toHaveProperty('notePath');
    expect(hits[0]).toHaveProperty('chunkIndex');
    expect(hits[0]).toHaveProperty('text');
    expect(hits[0]).toHaveProperty('distance');
    // FakeEmbedder is deterministic — exact-match query lands first
    expect(hits[0].text).toBe('alpha bravo');
  });

  it('respects an explicit limit', async () => {
    const { ctx } = await setup();
    const out = await semanticSearchTool.run({ query: 'alpha', limit: 1 }, ctx);
    expect(JSON.parse(out)).toHaveLength(1);
  });

  it('throws on empty or non-string query', async () => {
    const { ctx } = await setup();
    await expect(semanticSearchTool.run({ query: '' }, ctx)).rejects.toThrow(/query/);
    await expect(semanticSearchTool.run({}, ctx)).rejects.toThrow(/query/);
  });
});

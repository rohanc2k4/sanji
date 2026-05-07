import { describe, expect, it, afterEach, vi } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { Indexer } from './indexer.js';
import { FakeEmbedder } from '../embeddings/embedder.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function newIndexer(opts?: { blurbLlm?: (call: any) => Promise<string> }) {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  const ix = new Indexer(db, new FakeEmbedder(), {
    chunkSizeTokens: 100,
    chunkOverlapTokens: 10,
    ...(opts?.blurbLlm ? { blurbLlm: opts.blurbLlm } : {}),
  });
  return { db, ix };
}

const FIXTURE_VAULT = join(HERE, '../../tests/fixtures/vault');

describe('Indexer', () => {
  it('walks the fixture vault and indexes only markdown files', async () => {
    const { db, ix } = newIndexer();
    const stats = await ix.indexAll(FIXTURE_VAULT);
    expect(stats.notesIndexed).toBe(6);          // 6 .md, .txt ignored
    expect(stats.chunksIndexed).toBeGreaterThan(0);

    const titles = (db.prepare('SELECT title FROM notes ORDER BY path').all() as Array<{ title: string | null }>);
    expect(titles.some((t) => t.title === '2026-04-25')).toBe(true);

    const ftsHits = Number(
      (db.prepare("SELECT count(*) AS n FROM notes_fts WHERE notes_fts MATCH 'argocd'").get() as {
        n: bigint;
      }).n,
    );
    expect(ftsHits).toBeGreaterThan(0);

    const links = db
      .prepare("SELECT source_path FROM wikilinks WHERE target_slug = 'argocd'")
      .all() as Array<{ source_path: string }>;
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it('removes a note + cascaded chunks when indexDelete is called', async () => {
    const { db, ix } = newIndexer();
    await ix.indexAll(FIXTURE_VAULT);
    const before = Number(
      (db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint }).n,
    );
    expect(before).toBeGreaterThan(0);

    await ix.indexDelete('empty.md');
    const after = Number(
      (db.prepare("SELECT count(*) AS n FROM notes WHERE path = 'empty.md'").get() as {
        n: bigint;
      }).n,
    );
    expect(after).toBe(0);
  });

  it('calls onProgress once per file with monotonically increasing done', async () => {
    const { ix } = newIndexer();
    const calls: Array<{ done: number; total: number }> = [];
    const stats = await ix.indexAll(FIXTURE_VAULT, {
      onProgress: (done, total) => calls.push({ done, total }),
    });
    const expectedTotal = stats.notesIndexed + stats.notesSkipped;
    expect(calls.length).toBe(expectedTotal);
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < calls.length; i++) {
      const c = calls[i]!;
      expect(c.total).toBe(expectedTotal);
      expect(c.done).toBe(i + 1);
    }
  });

  // R1 contextual retrieval is opt-in: when no blurbLlm is wired, the indexer
  // must not call any LLM and must persist context_text = null on every chunk.
  it('does not invoke any LLM when blurbLlm is omitted (opt-in surface)', async () => {
    const blurb = vi.fn(async () => 'should not be called');
    const { db, ix } = newIndexer(); // no blurbLlm
    const stats = await ix.indexAll(FIXTURE_VAULT);
    expect(blurb).not.toHaveBeenCalled();
    expect(stats.blurbsAttempted).toBe(0);
    expect(stats.blurbsFailed).toBe(0);
    const ctxRow = db
      .prepare("SELECT count(*) AS n FROM chunks WHERE context_text IS NOT NULL")
      .get() as { n: bigint };
    expect(Number(ctxRow.n)).toBe(0);
    const total = db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint };
    expect(Number(total.n)).toBeGreaterThan(0);
  });

  // When blurbLlm is wired, every chunk attempt routes through it and the
  // result lands in context_text. Confirms we actually use the dep.
  it('writes blurb output to context_text when blurbLlm is wired', async () => {
    const blurb = vi.fn(async () => 'stub-context');
    const { db, ix } = newIndexer({ blurbLlm: blurb });
    const stats = await ix.indexAll(FIXTURE_VAULT);
    expect(blurb).toHaveBeenCalled();
    expect(stats.blurbsAttempted).toBeGreaterThan(0);
    expect(stats.blurbsFailed).toBe(0);
    expect(blurb.mock.calls.length).toBe(stats.blurbsAttempted);
    const ctxRow = db
      .prepare("SELECT count(*) AS n FROM chunks WHERE context_text = 'stub-context'")
      .get() as { n: bigint };
    expect(Number(ctxRow.n)).toBeGreaterThan(0);
  });

  // When the blurb LLM rejects on every call, indexing must still complete
  // (chunks land with context_text=null), and the failure must surface in
  // aggregate stats + a stderr ERROR line so it isn't silently lost.
  it('surfaces aggregate blurb failures instead of silently nulling context', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const blurb = vi.fn(async () => {
        throw new Error('upstream 400');
      });
      const { db, ix } = newIndexer({ blurbLlm: blurb });
      const stats = await ix.indexAll(FIXTURE_VAULT);
      // Chunks still got written, just without context.
      const total = db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint };
      expect(Number(total.n)).toBeGreaterThan(0);
      const ctxNotNull = db
        .prepare('SELECT count(*) AS n FROM chunks WHERE context_text IS NOT NULL')
        .get() as { n: bigint };
      expect(Number(ctxNotNull.n)).toBe(0);
      // Aggregate counts surface the failure mode.
      expect(stats.blurbsAttempted).toBeGreaterThan(0);
      expect(stats.blurbsFailed).toBe(stats.blurbsAttempted);
      // Aggregate ERROR line printed once at the end of indexAll.
      const writes = stderr.mock.calls.map((c) => String(c[0]));
      expect(writes.some((w) => /ERROR: contextual retrieval failed for ALL/.test(w))).toBe(true);
    } finally {
      stderr.mockRestore();
    }
  });

  it('idempotently re-indexes the same file', async () => {
    const { db, ix } = newIndexer();
    await ix.indexAll(FIXTURE_VAULT);
    const counts1 = Number(
      (db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint }).n,
    );
    await ix.indexAll(FIXTURE_VAULT);
    const counts2 = Number(
      (db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint }).n,
    );
    expect(counts2).toBe(counts1);
  });
});

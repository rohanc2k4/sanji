import { describe, expect, it, afterEach } from 'vitest';
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

function newIndexer() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  const ix = new Indexer(db, new FakeEmbedder(), {
    chunkSizeTokens: 100,
    chunkOverlapTokens: 10,
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

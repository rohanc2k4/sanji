import { describe, expect, it, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { IndexRepo } from './repo.js';
import { FakeEmbedder } from '../embeddings/embedder.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function setup() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  return { db, repo: new IndexRepo(db), embedder: new FakeEmbedder() };
}

describe('IndexRepo — notes', () => {
  it('upserts a note and finds it via FTS', () => {
    const { db, repo } = setup();
    repo.upsertNote({
      path: 'a.md',
      mtimeMs: 10,
      body: 'hello world about argocd',
      frontmatter: { type: 'note' },
      title: 'A',
    });
    const hits = (
      db.prepare("SELECT path FROM notes_fts WHERE notes_fts MATCH 'argocd'").all() as Array<{
        path: string;
      }>
    ).map((h) => h.path);
    expect(hits).toEqual(['a.md']);
    expect(repo.getNote('a.md')?.title).toBe('A');
  });

  it('updates a note in place and refreshes FTS', () => {
    const { db, repo } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'first', frontmatter: null, title: null });
    repo.upsertNote({ path: 'a.md', mtimeMs: 2, body: 'second argocd', frontmatter: null, title: null });
    // count assertion — wrap in Number(...) per the bigint rule
    const n = Number(
      (db.prepare("SELECT count(*) AS n FROM notes_fts WHERE notes_fts MATCH 'argocd'").get() as {
        n: bigint;
      }).n,
    );
    expect(n).toBe(1);
    expect(repo.getNote('a.md')?.body).toBe('second argocd');
  });

  it('deletes a note and clears it from FTS', () => {
    const { db, repo } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'argocd', frontmatter: null, title: null });
    repo.deleteNote('a.md');
    const n = Number(
      (db.prepare("SELECT count(*) AS n FROM notes_fts WHERE notes_fts MATCH 'argocd'").get() as {
        n: bigint;
      }).n,
    );
    expect(n).toBe(0);
    expect(repo.getNote('a.md')).toBeNull();
  });

  it('lists every note path', () => {
    const { repo } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'a', frontmatter: null, title: null });
    repo.upsertNote({ path: 'b.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    expect(repo.allNotePaths().sort()).toEqual(['a.md', 'b.md']);
  });
});

describe('IndexRepo — chunks', () => {
  it('replaces chunks for a note in a single transaction', async () => {
    const { db, repo, embedder } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    const v1 = await embedder.embed('first');
    const v2 = await embedder.embed('second');
    repo.replaceChunksForNote('a.md', [
      { chunkIndex: 0, text: 'first', startChar: 0, endChar: 5, embedding: v1 },
      { chunkIndex: 1, text: 'second', startChar: 6, endChar: 12, embedding: v2 },
    ]);
    const cChunks = Number((db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint }).n);
    const cVec = Number((db.prepare('SELECT count(*) AS n FROM chunks_vec').get() as { n: bigint }).n);
    expect(cChunks).toBe(2);
    expect(cVec).toBe(2);

    const v3 = await embedder.embed('only');
    repo.replaceChunksForNote('a.md', [
      { chunkIndex: 0, text: 'only', startChar: 0, endChar: 4, embedding: v3 },
    ]);
    expect(Number((db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint }).n)).toBe(1);
    expect(Number((db.prepare('SELECT count(*) AS n FROM chunks_vec').get() as { n: bigint }).n)).toBe(1);
  });

  it('finds nearest neighbors via vec0', async () => {
    const { repo, embedder } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    const v1 = await embedder.embed('alpha');
    const v2 = await embedder.embed('omega');
    repo.replaceChunksForNote('a.md', [
      { chunkIndex: 0, text: 'alpha', startChar: 0, endChar: 5, embedding: v1 },
      { chunkIndex: 1, text: 'omega', startChar: 6, endChar: 11, embedding: v2 },
    ]);
    const target = await embedder.embed('alpha');
    const hits = repo.knnChunks(target, 1);
    expect(hits[0]?.text).toBe('alpha');
  });

  it('cascades delete from chunks → chunks_vec', async () => {
    const { db, repo, embedder } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    const v1 = await embedder.embed('first');
    repo.replaceChunksForNote('a.md', [
      { chunkIndex: 0, text: 'first', startChar: 0, endChar: 5, embedding: v1 },
    ]);
    repo.deleteChunksForNote('a.md');
    expect(Number((db.prepare('SELECT count(*) AS n FROM chunks').get() as { n: bigint }).n)).toBe(0);
    expect(Number((db.prepare('SELECT count(*) AS n FROM chunks_vec').get() as { n: bigint }).n)).toBe(0);
  });
});

describe('IndexRepo — wikilinks', () => {
  it("replaces a source's wikilinks atomically", () => {
    const { repo } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    repo.replaceLinksForSource('a.md', [
      { sourcePath: 'a.md', targetSlug: 'foo', occurrenceCount: 2 },
      { sourcePath: 'a.md', targetSlug: 'bar', occurrenceCount: 1 },
    ]);
    const out = repo.outboundLinks('a.md').sort((x, y) => x.targetSlug.localeCompare(y.targetSlug));
    expect(out).toEqual([
      { sourcePath: 'a.md', targetSlug: 'bar', occurrenceCount: 1 },
      { sourcePath: 'a.md', targetSlug: 'foo', occurrenceCount: 2 },
    ]);

    repo.replaceLinksForSource('a.md', [
      { sourcePath: 'a.md', targetSlug: 'baz', occurrenceCount: 1 },
    ]);
    expect(repo.outboundLinks('a.md')).toEqual([
      { sourcePath: 'a.md', targetSlug: 'baz', occurrenceCount: 1 },
    ]);
  });

  it('finds inbound links by slug', () => {
    const { repo } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    repo.upsertNote({ path: 'b.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    repo.replaceLinksForSource('a.md', [{ sourcePath: 'a.md', targetSlug: 'foo', occurrenceCount: 1 }]);
    repo.replaceLinksForSource('b.md', [{ sourcePath: 'b.md', targetSlug: 'foo', occurrenceCount: 3 }]);
    expect(repo.inboundLinks('foo').map((w) => w.sourcePath).sort()).toEqual(['a.md', 'b.md']);
  });

  it('drops all rows when source is deleted', () => {
    const { repo } = setup();
    repo.upsertNote({ path: 'a.md', mtimeMs: 1, body: 'b', frontmatter: null, title: null });
    repo.replaceLinksForSource('a.md', [{ sourcePath: 'a.md', targetSlug: 'foo', occurrenceCount: 1 }]);
    repo.deleteLinksForSource('a.md');
    expect(repo.outboundLinks('a.md')).toEqual([]);
  });
});

import { describe, expect, it, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from './client.js';
import { runMigrations } from './migrate.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function fresh() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  return db;
}

describe('runMigrations', () => {
  it('creates the regular tables', () => {
    const db = fresh();
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{
        name: string;
      }>
    ).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['notes', 'chunks', 'wikilinks', 'meta', '_migrations']));
  });

  it('is idempotent on re-run', () => {
    const db = fresh();
    runMigrations(db); // must not throw
    const applied = (db.prepare('SELECT count(*) AS n FROM _migrations').get() as { n: bigint }).n;
    expect(applied).toBe(2n);
  });

  it('FTS5 trigger keeps notes_fts in sync on insert / delete / update', () => {
    const db = fresh();
    db.prepare(
      'INSERT INTO notes (path, mtime_ms, body, frontmatter_json, title) VALUES (?, ?, ?, NULL, ?)',
    ).run('a.md', 1, 'argocd pipeline notes', 'A');
    let hits = (
      db.prepare("SELECT path FROM notes_fts WHERE notes_fts MATCH 'argocd'").all() as Array<{
        path: string;
      }>
    ).map((h) => h.path);
    expect(hits).toContain('a.md');

    db.prepare('UPDATE notes SET body = ? WHERE path = ?').run('totally different content', 'a.md');
    hits = (
      db.prepare("SELECT path FROM notes_fts WHERE notes_fts MATCH 'argocd'").all() as Array<{
        path: string;
      }>
    ).map((h) => h.path);
    expect(hits).toEqual([]);

    db.prepare('DELETE FROM notes WHERE path = ?').run('a.md');
    const remaining = (
      db.prepare("SELECT count(*) AS n FROM notes_fts WHERE notes_fts MATCH 'different'").get() as {
        n: bigint;
      }
    ).n;
    expect(remaining).toBe(0n);
  });

  it('chunks_vec virtual table accepts 384-dim float vectors', () => {
    const db = fresh();
    db.prepare(
      'INSERT INTO notes (path, mtime_ms, body, frontmatter_json, title) VALUES (?, ?, ?, NULL, ?)',
    ).run('a.md', 1, 'body', 'A');
    const chunkId = (
      db
        .prepare(
          'INSERT INTO chunks (note_path, chunk_index, text, start_char, end_char) VALUES (?, 0, ?, 0, 4) RETURNING id',
        )
        .get('a.md', 'body') as { id: number }
    ).id;

    const vec = new Float32Array(384);
    vec[0] = 1;
    db.prepare('INSERT INTO chunks_vec (rowid, embedding) VALUES (?, ?)').run(
      chunkId,
      Buffer.from(vec.buffer),
    );

    const target = new Float32Array(384);
    target[0] = 1;
    const knn = db
      .prepare("SELECT rowid, distance FROM chunks_vec WHERE embedding MATCH ? AND k = 1")
      .all(Buffer.from(target.buffer)) as Array<{ rowid: number; distance: number }>;
    expect(knn[0]?.rowid).toBe(chunkId);
  });
});

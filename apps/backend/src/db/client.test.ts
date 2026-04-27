import { describe, expect, it, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from './client.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

describe('openDb', () => {
  it('opens a SQLite db and loads sqlite-vec', () => {
    const { dir, cleanup } = makeTmpDir();
    cleanups.push(cleanup);
    const db = openDb(join(dir, 'index.db'));
    const vecVersion = db.prepare('SELECT vec_version() AS v').get() as { v: string };
    expect(typeof vecVersion.v).toBe('string');
    expect(vecVersion.v.length).toBeGreaterThan(0);

    const fts = db.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS f").get() as {
      f: bigint;
    };
    expect(fts.f).toBe(1n);
    db.close();
  });

  it('applies recommended PRAGMAs', () => {
    const { dir, cleanup } = makeTmpDir();
    cleanups.push(cleanup);
    const db = openDb(join(dir, 'index.db'));
    expect((db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode).toBe(
      'wal',
    );
    expect((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: bigint }).foreign_keys).toBe(
      1n,
    );
    db.close();
  });
});

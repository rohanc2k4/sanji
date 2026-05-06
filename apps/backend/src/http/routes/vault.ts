import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { VaultPaths } from '../../config/paths.js';
import type { NoteSummary } from '@sanji/shared';

interface NoteRow { path: string; title: string | null; mtime_ms: bigint | number }

export function vaultRoute(deps: { db: Database.Database; paths: VaultPaths }) {
  const r = new Hono();
  // Safety cap so a 50k-note vault doesn't serialize the whole list into one
  // JSON response. Pagination is a v0.2 polish item; for now, 5000 covers the
  // long tail of personal vaults without the worst-case blowup.
  const ROW_LIMIT = 5000;
  r.get('/api/vault/notes', (c) => {
    const prefix = c.req.query('prefix');
    const rows = (
      prefix
        ? deps.db.prepare('SELECT path, title, mtime_ms FROM notes WHERE path LIKE ? ORDER BY path LIMIT ?').all(`${prefix}%`, ROW_LIMIT)
        : deps.db.prepare('SELECT path, title, mtime_ms FROM notes ORDER BY path LIMIT ?').all(ROW_LIMIT)
    ) as NoteRow[];
    const notes: NoteSummary[] = rows.map((row) => ({
      path: row.path,
      title: row.title,
      mtimeMs: Number(row.mtime_ms),
    }));
    return c.json(notes);
  });
  return r;
}

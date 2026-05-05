import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { VaultPaths } from '../../config/paths.js';
import type { NoteSummary } from '@sanji/shared';

interface NoteRow { path: string; title: string | null; mtime_ms: bigint | number }

export function vaultRoute(deps: { db: Database.Database; paths: VaultPaths }) {
  const r = new Hono();
  r.get('/api/vault/notes', (c) => {
    const prefix = c.req.query('prefix');
    const rows = (
      prefix
        ? deps.db.prepare('SELECT path, title, mtime_ms FROM notes WHERE path LIKE ? ORDER BY path').all(`${prefix}%`)
        : deps.db.prepare('SELECT path, title, mtime_ms FROM notes ORDER BY path').all()
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

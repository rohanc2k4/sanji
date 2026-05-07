import type { Note, Wikilink } from '@sanji/shared';
import type { Db } from '../db/client.js';

export interface ChunkUpsert {
  chunkIndex: number;
  text: string;
  startChar: number;
  endChar: number;
  embedding: Float32Array;
  headerTrail?: string[];
}

export interface ChunkHit {
  id: number;
  notePath: string;
  chunkIndex: number;
  text: string;
  startChar: number;
  endChar: number;
  distance: number;
  headerTrail: string[];
}

export class IndexRepo {
  constructor(private db: Db) {}

  // ─── notes ──────────────────────────────────────────────────────────

  upsertNote(note: Note): void {
    this.db
      .prepare(
        `INSERT INTO notes (path, mtime_ms, body, frontmatter_json, title, updated_at)
         VALUES (@path, @mtimeMs, @body, @frontmatter, @title, unixepoch() * 1000)
         ON CONFLICT(path) DO UPDATE SET
           mtime_ms = excluded.mtime_ms,
           body = excluded.body,
           frontmatter_json = excluded.frontmatter_json,
           title = excluded.title,
           updated_at = unixepoch() * 1000`,
      )
      .run({
        path: note.path,
        mtimeMs: note.mtimeMs,
        body: note.body,
        frontmatter: note.frontmatter ? JSON.stringify(note.frontmatter) : null,
        title: note.title,
      });
  }

  getNote(path: string): Note | null {
    const row = this.db
      .prepare(
        'SELECT path, mtime_ms AS mtimeMs, body, frontmatter_json AS frontmatterJson, title FROM notes WHERE path = ?',
      )
      .get(path) as
      | { path: string; mtimeMs: bigint; body: string; frontmatterJson: string | null; title: string | null }
      | undefined;
    if (!row) return null;
    return {
      path: row.path,
      mtimeMs: Number(row.mtimeMs),
      body: row.body,
      frontmatter: row.frontmatterJson ? (JSON.parse(row.frontmatterJson) as Record<string, unknown>) : null,
      title: row.title,
    };
  }

  deleteNote(path: string): void {
    this.db.prepare('DELETE FROM notes WHERE path = ?').run(path);
  }

  allNotePaths(): string[] {
    return (this.db.prepare('SELECT path FROM notes').all() as Array<{ path: string }>).map(
      (r) => r.path,
    );
  }

  listNotesForContext(): Array<{
    path: string;
    title: string | null;
    frontmatter_json: string | null;
    body: string;
  }> {
    return this.db
      .prepare('SELECT path, title, frontmatter_json, body FROM notes ORDER BY path')
      .all() as Array<{
      path: string;
      title: string | null;
      frontmatter_json: string | null;
      body: string;
    }>;
  }

  // ─── chunks ─────────────────────────────────────────────────────────

  replaceChunksForNote(notePath: string, chunks: ChunkUpsert[]): void {
    const tx = this.db.transaction((items: ChunkUpsert[]) => {
      this.db
        .prepare('DELETE FROM chunks_vec WHERE rowid IN (SELECT id FROM chunks WHERE note_path = ?)')
        .run(notePath);
      this.db.prepare('DELETE FROM chunks WHERE note_path = ?').run(notePath);

      const insertRow = this.db.prepare(
        'INSERT INTO chunks (note_path, chunk_index, text, start_char, end_char, header_trail) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      );
      const insertVec = this.db.prepare('INSERT INTO chunks_vec (rowid, embedding) VALUES (?, ?)');
      for (const c of items) {
        const trailJson = c.headerTrail && c.headerTrail.length ? JSON.stringify(c.headerTrail) : null;
        const { id } = insertRow.get(
          notePath,
          c.chunkIndex,
          c.text,
          c.startChar,
          c.endChar,
          trailJson,
        ) as { id: bigint };
        insertVec.run(id, Buffer.from(c.embedding.buffer, c.embedding.byteOffset, c.embedding.byteLength));
      }
    });
    tx(chunks);
  }

  deleteChunksForNote(notePath: string): void {
    const tx = this.db.transaction(() => {
      this.db
        .prepare('DELETE FROM chunks_vec WHERE rowid IN (SELECT id FROM chunks WHERE note_path = ?)')
        .run(notePath);
      this.db.prepare('DELETE FROM chunks WHERE note_path = ?').run(notePath);
    });
    tx();
  }

  firstChunk(path: string): ChunkHit | null {
    type Row = {
      id: bigint;
      notePath: string;
      chunkIndex: bigint;
      text: string;
      startChar: bigint;
      endChar: bigint;
      headerTrail: string | null;
    };
    const row = this.db
      .prepare(
        `SELECT id, note_path AS notePath, chunk_index AS chunkIndex,
                text, start_char AS startChar, end_char AS endChar,
                header_trail AS headerTrail
         FROM chunks WHERE note_path = ? ORDER BY chunk_index ASC LIMIT 1`,
      )
      .get(path) as Row | undefined;
    if (!row) return null;
    return {
      id: Number(row.id),
      notePath: row.notePath,
      chunkIndex: Number(row.chunkIndex),
      text: row.text,
      startChar: Number(row.startChar),
      endChar: Number(row.endChar),
      distance: 0,
      headerTrail: row.headerTrail ? (JSON.parse(row.headerTrail) as string[]) : [],
    };
  }

  knnChunks(query: Float32Array, k: number): ChunkHit[] {
    type Row = {
      id: bigint;
      notePath: string;
      chunkIndex: bigint;
      text: string;
      startChar: bigint;
      endChar: bigint;
      distance: number;
      headerTrail: string | null;
    };
    const rows = this.db
      .prepare(
        `SELECT c.id, c.note_path AS notePath, c.chunk_index AS chunkIndex,
                c.text, c.start_char AS startChar, c.end_char AS endChar,
                c.header_trail AS headerTrail,
                v.distance
         FROM chunks_vec v JOIN chunks c ON c.id = v.rowid
         WHERE v.embedding MATCH ? AND v.k = ?
         ORDER BY v.distance`,
      )
      .all(Buffer.from(query.buffer, query.byteOffset, query.byteLength), k) as Row[];
    return rows.map((r) => ({
      id: Number(r.id),
      notePath: r.notePath,
      chunkIndex: Number(r.chunkIndex),
      text: r.text,
      startChar: Number(r.startChar),
      endChar: Number(r.endChar),
      distance: r.distance,
      headerTrail: r.headerTrail ? (JSON.parse(r.headerTrail) as string[]) : [],
    }));
  }

  // ─── wikilinks ──────────────────────────────────────────────────────

  replaceLinksForSource(sourcePath: string, links: Wikilink[]): void {
    const tx = this.db.transaction((items: Wikilink[]) => {
      this.db.prepare('DELETE FROM wikilinks WHERE source_path = ?').run(sourcePath);
      const ins = this.db.prepare(
        'INSERT INTO wikilinks (source_path, target_slug, occurrence_count) VALUES (?, ?, ?)',
      );
      for (const w of items) ins.run(w.sourcePath, w.targetSlug, w.occurrenceCount);
    });
    tx(links);
  }

  deleteLinksForSource(sourcePath: string): void {
    this.db.prepare('DELETE FROM wikilinks WHERE source_path = ?').run(sourcePath);
  }

  outboundLinks(sourcePath: string): Wikilink[] {
    type Row = { sourcePath: string; targetSlug: string; occurrenceCount: bigint };
    return (
      this.db
        .prepare(
          'SELECT source_path AS sourcePath, target_slug AS targetSlug, occurrence_count AS occurrenceCount FROM wikilinks WHERE source_path = ?',
        )
        .all(sourcePath) as Row[]
    ).map((r) => ({
      sourcePath: r.sourcePath,
      targetSlug: r.targetSlug,
      occurrenceCount: Number(r.occurrenceCount),
    }));
  }

  inboundLinks(targetSlug: string): Wikilink[] {
    type Row = { sourcePath: string; targetSlug: string; occurrenceCount: bigint };
    return (
      this.db
        .prepare(
          'SELECT source_path AS sourcePath, target_slug AS targetSlug, occurrence_count AS occurrenceCount FROM wikilinks WHERE target_slug = ?',
        )
        .all(targetSlug) as Row[]
    ).map((r) => ({
      sourcePath: r.sourcePath,
      targetSlug: r.targetSlug,
      occurrenceCount: Number(r.occurrenceCount),
    }));
  }
}

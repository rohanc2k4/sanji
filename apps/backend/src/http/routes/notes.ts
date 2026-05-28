import { Hono } from 'hono';
import { readFile, mkdir, rename as fsRename, writeFile, copyFile, unlink } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { parseNote } from '../../vault/parse.js';
import { writeNoteTool } from '../../tools/write-note.js';
import { validateVaultRelativePath } from '../../tools/validation.js';
import type { VaultPaths } from '../../config/paths.js';
import type { ToolContext } from '../../tools/types.js';
import type { Indexer } from '../../index/indexer.js';
import type { IndexRepo } from '../../index/repo.js';

/**
 * Rewrite the in-file identity of a note to match its new filename.
 *
 * - If the file has YAML frontmatter with a `title:` field, replace its value
 *   with `newTitle` (preserving the rest of the block as-is).
 * - If the body's first non-blank line is an H1, replace its text with
 *   `newTitle`.
 *
 * Returns the rewritten source. Idempotent when the title already matches.
 */
export function syncTitleToFilename(source: string, newTitle: string): string {
  let out = source;
  // Track the rebuilt frontmatter length separately. When the new title is
  // shorter than the old one, `out` shrinks by exactly that delta and the
  // original fmMatch[0].length over-shoots into the body — slicing `rest`
  // from that stale offset can cut past the first H1, so the H1 regex
  // never matches and the rename leaves a stale heading despite a
  // successful frontmatter sync.
  let newFmLength = 0;

  const fmMatch = out.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n?)/);
  if (fmMatch) {
    const head = fmMatch[1]!;
    const block = fmMatch[2]!;
    const tail = fmMatch[3]!;
    const titleLineRe = /^title:[ \t]*.*$/m;
    let newBlock = block;
    if (titleLineRe.test(block)) {
      const safe = /[:#\n]/.test(newTitle) ? JSON.stringify(newTitle) : newTitle;
      newBlock = block.replace(titleLineRe, `title: ${safe}`);
    }
    out = head + newBlock + tail + out.slice(fmMatch[0].length);
    newFmLength = head.length + newBlock.length + tail.length;
  }

  // Replace the first H1 in the body (after the REBUILT frontmatter).
  const head = out.slice(0, newFmLength);
  const rest = out.slice(newFmLength);
  const h1Re = /^#\s+.+$/m;
  const h1Match = rest.match(h1Re);
  if (h1Match) {
    out = head + rest.replace(h1Re, `# ${newTitle}`);
  }

  return out;
}

function titleFromFilename(relPath: string): string {
  return basename(relPath, extname(relPath));
}

export function notesRoute(deps: { paths: VaultPaths; repo?: IndexRepo; indexer?: Indexer }) {
  const r = new Hono();

  r.get('/api/notes/*', async (c) => {
    const raw = c.req.path.replace(/^\/api\/notes\//, '');
    const decoded = decodeURIComponent(raw);
    let validated: string;
    try { validated = validateVaultRelativePath(decoded); }
    catch (err) { return c.json({ kind: 'api-error', code: 'BAD_PATH', message: (err as Error).message }, 400); }
    const abs = join(deps.paths.vault, validated);
    if (!existsSync(abs)) return c.json({ kind: 'api-error', code: 'NOT_FOUND', message: validated }, 404);
    const source = await readFile(abs, 'utf8');
    const mtimeMs = statSync(abs).mtimeMs;
    const parsed = parseNote(validated, source, mtimeMs);
    return c.json({
      path: parsed.note.path,
      title: parsed.note.title,
      frontmatter: parsed.note.frontmatter,
      body: parsed.note.body,
    });
  });

  r.put('/api/notes/*', async (c) => {
    const raw = c.req.path.replace(/^\/api\/notes\//, '');
    const decoded = decodeURIComponent(raw);
    let validated: string;
    try { validated = validateVaultRelativePath(decoded); }
    catch (err) { return c.json({ kind: 'api-error', code: 'BAD_PATH', message: (err as Error).message }, 400); }
    const body = await c.req.json().catch(() => null) as { content?: unknown } | null;
    if (!body || typeof body.content !== 'string') {
      return c.json({ kind: 'api-error', code: 'BAD_BODY', message: 'content must be string' }, 400);
    }
    // writeNoteTool.run only reads ctx.paths at runtime; the other ToolContext
    // fields (db, repo, embedder) are unused here, so a partial cast is safe.
    const ctx = { paths: deps.paths } as unknown as ToolContext;
    try {
      const result = await writeNoteTool.run({ path: validated, content: body.content }, ctx);
      // Re-index the saved note so chunks + embeddings reflect the new
      // body. A bare upsertNote() would only stamp the new mtime onto the
      // notes row; Indexer.indexFile() skips on mtime + schema_version
      // match, so the next full pass would treat the changed file as
      // already-current and leave semantic/hybrid search on stale chunks
      // indefinitely. When an indexer is wired, prefer indexFile(); when
      // it isn't (degraded tests), fall back to upsertNote so at least
      // the SourcesSidebar listing stays in sync.
      if (deps.indexer) {
        try {
          await deps.indexer.indexFile(deps.paths.vault, validated);
        } catch (err) {
          // Index failure here would otherwise be silent: the file IS on
          // disk with a new mtime, so a bare upsertNote (or even no-op)
          // leaves Indexer.indexFile()'s skip-on-match check happy and
          // chunks stay stale forever. Clear index_schema_version so the
          // next full pass picks it up unconditionally.
          if (deps.repo) deps.repo.invalidateNoteIndexVersion(validated);
          process.stderr.write(
            `post-save indexFile failed for ${validated}: ${
              err instanceof Error ? err.message : String(err)
            }\n`,
          );
        }
      } else if (deps.repo) {
        const abs = join(deps.paths.vault, validated);
        const mtimeMs = statSync(abs).mtimeMs;
        // Re-read from disk: write-note may have re-prepended preserved
        // frontmatter, so the bytes on disk can differ from body.content.
        const onDisk = await readFile(abs, 'utf8');
        const parsed = parseNote(validated, onDisk, mtimeMs);
        deps.repo.upsertNote(parsed.note);
      }
      return c.json(JSON.parse(result));
    } catch (err) {
      return c.json({ kind: 'api-error', code: 'WRITE_FAILED', message: (err as Error).message }, 400);
    }
  });

  r.post('/api/notes', async (c) => {
    const body = await c.req.json().catch(() => null) as { path?: unknown; content?: unknown } | null;
    if (!body || typeof body.path !== 'string') {
      return c.json({ kind: 'api-error', code: 'BAD_BODY', message: 'path must be string' }, 400);
    }
    if (body.content !== undefined && typeof body.content !== 'string') {
      return c.json({ kind: 'api-error', code: 'BAD_BODY', message: 'content must be string when provided' }, 400);
    }
    let validated: string;
    try { validated = validateVaultRelativePath(body.path); }
    catch (err) { return c.json({ kind: 'api-error', code: 'BAD_PATH', message: (err as Error).message }, 400); }
    const abs = join(deps.paths.vault, validated);
    if (existsSync(abs)) {
      return c.json({ kind: 'api-error', code: 'TARGET_EXISTS', message: validated }, 409);
    }
    const titleFromPath = basename(validated, extname(validated));
    const skeleton = body.content ?? `---\ntitle: ${titleFromPath}\ncreated: ${new Date().toISOString()}\n---\n\n# ${titleFromPath}\n\n`;
    try {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, skeleton, 'utf8');
    } catch (err) {
      return c.json({ kind: 'api-error', code: 'FS_FAILED', message: (err as Error).message }, 500);
    }
    if (deps.indexer) {
      try { await deps.indexer.indexFile(deps.paths.vault, validated); }
      catch (err) {
        if (deps.repo) deps.repo.invalidateNoteIndexVersion(validated);
        process.stderr.write(`post-create indexFile failed for ${validated}: ${(err as Error).message}\n`);
      }
    } else if (deps.repo) {
      const mtimeMs = statSync(abs).mtimeMs;
      const parsed = parseNote(validated, skeleton, mtimeMs);
      deps.repo.upsertNote(parsed.note);
    }
    return c.json({ path: validated });
  });

  r.post('/api/notes/rename', async (c) => {
    const body = await c.req.json().catch(() => null) as { from?: unknown; to?: unknown } | null;
    if (!body || typeof body.from !== 'string' || typeof body.to !== 'string') {
      return c.json({ kind: 'api-error', code: 'BAD_BODY', message: 'from + to must be strings' }, 400);
    }
    let fromValid: string;
    let toValid: string;
    try {
      fromValid = validateVaultRelativePath(body.from);
      toValid = validateVaultRelativePath(body.to);
    } catch (err) {
      return c.json({ kind: 'api-error', code: 'BAD_PATH', message: (err as Error).message }, 400);
    }
    if (fromValid === toValid) {
      return c.json({ from: fromValid, to: toValid });
    }
    const fromAbs = join(deps.paths.vault, fromValid);
    const toAbs = join(deps.paths.vault, toValid);
    if (!existsSync(fromAbs)) {
      return c.json({ kind: 'api-error', code: 'NOT_FOUND', message: fromValid }, 404);
    }
    if (existsSync(toAbs)) {
      return c.json({ kind: 'api-error', code: 'TARGET_EXISTS', message: toValid }, 409);
    }
    try {
      await mkdir(dirname(toAbs), { recursive: true });
      await fsRename(fromAbs, toAbs);
    } catch (err) {
      return c.json({ kind: 'api-error', code: 'RENAME_FAILED', message: (err as Error).message }, 500);
    }

    // Sync the in-file identity (frontmatter title + first H1) to the new
    // filename so renaming acts on the conceptual note, not just the path.
    // Only applies to .md files; other extensions pass through untouched.
    //
    // The previous implementation called writeFile(toAbs) directly inside a
    // try/catch that swallowed any error. A mid-write disk-full or process
    // interruption would leave the renamed note truncated, but the route
    // would still report 200 success. Now: snapshot the original to
    // .sanji/versions/ first (matches the discipline used by write_note),
    // write to a temp path, then rename atomically. On failure, restore
    // from the snapshot we just took and surface a 500 to the client.
    if (toValid.toLowerCase().endsWith('.md')) {
      let snapshotPath: string | null = null;
      try {
        const source = await readFile(toAbs, 'utf8');
        const newTitle = titleFromFilename(toValid);
        const updated = syncTitleToFilename(source, newTitle);
        if (updated !== source) {
          // Snapshot first — this is identical to the path write_note
          // uses for its versions trail. Filename is the relative path
          // with `/` flattened to `__`, suffixed with the timestamp so
          // versions for nested notes don't collide.
          const versionsDir = join(deps.paths.vault, '.sanji', 'versions');
          await mkdir(versionsDir, { recursive: true });
          const stamp = `${toValid.replace(/[\/]/g, '__')}.${Date.now()}`;
          snapshotPath = join(versionsDir, stamp);
          await copyFile(toAbs, snapshotPath);

          // Atomic temp + rename. If the writeFile or rename throws (e.g.
          // ENOSPC mid-write), the catch below restores from the snapshot
          // so the renamed note is never left partially written.
          const tempPath = `${toAbs}.tmp.${Date.now()}`;
          try {
            await writeFile(tempPath, updated, 'utf8');
            await fsRename(tempPath, toAbs);
          } catch (writeErr) {
            // Best-effort cleanup of the temp file; ignore failures here
            // (the snapshot restore is what protects the user's data).
            await unlink(tempPath).catch(() => {});
            throw writeErr;
          }
        }
      } catch (err) {
        // Restore from snapshot if we made one — the file on disk after
        // the rename earlier in this handler is still the user's note;
        // we just may have truncated it.
        if (snapshotPath) {
          try { await copyFile(snapshotPath, toAbs); } catch { /* drop */ }
        }
        // The fsRename above already moved bytes from `from` to `to`. If
        // we leave them there and return 500, the UI / index still
        // believe the rename failed and will 404 on the original path.
        // Move the file back so the user-visible state matches the API
        // verdict; best-effort because if this also fails we'd rather
        // surface the original error than nest a recovery throw.
        try {
          await fsRename(toAbs, fromAbs);
        } catch {
          /* drop — surfaces in the 500 below */
        }
        return c.json({
          kind: 'api-error',
          code: 'TITLE_SYNC_FAILED',
          message: `Title sync after rename failed for ${toValid}: ${
            (err as Error).message
          }`,
        }, 500);
      }
    }

    if (deps.repo) {
      try {
        // Always purge the old path (chunks + wikilinks cascade with deleteNote).
        deps.repo.deleteNote(fromValid);
        if (deps.indexer) {
          // Full re-chunk + re-embed at the new path so semantic_search /
          // hybrid_search keep returning hits for the renamed note instead
          // of going dark until the next full indexAll().
          await deps.indexer.indexFile(deps.paths.vault, toValid);
        } else {
          // No indexer wired — upsert a bare notes row so SourcesSidebar
          // sees the new path. Watcher reconciles chunks async.
          const source = await readFile(toAbs, 'utf8');
          const mtimeMs = statSync(toAbs).mtimeMs;
          const parsed = parseNote(toValid, source, mtimeMs);
          deps.repo.upsertNote(parsed.note);
        }
      } catch (err) {
        process.stderr.write(
          `post-rename index update failed for ${toValid}: ${
            err instanceof Error ? err.message : String(err)
          }\n`,
        );
      }
    }
    return c.json({ from: fromValid, to: toValid });
  });

  return r;
}

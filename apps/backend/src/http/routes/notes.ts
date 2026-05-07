import { Hono } from 'hono';
import { readFile, mkdir, rename as fsRename, writeFile } from 'node:fs/promises';
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
  }

  // Replace the first H1 in the body (after frontmatter).
  const fmEnd = fmMatch ? fmMatch[0].length : 0;
  const head = out.slice(0, fmEnd);
  const rest = out.slice(fmEnd);
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
      // Upsert into the notes index so the saved file appears in the
      // SourcesSidebar listing immediately. The chokidar watcher and
      // chunk/embedding pipeline catch up async; for sidebar visibility,
      // having the notes row is enough.
      if (deps.repo) {
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
    if (toValid.toLowerCase().endsWith('.md')) {
      try {
        const source = await readFile(toAbs, 'utf8');
        const newTitle = titleFromFilename(toValid);
        const updated = syncTitleToFilename(source, newTitle);
        if (updated !== source) {
          await writeFile(toAbs, updated, 'utf8');
        }
      } catch {
        // Non-fatal — leave the body as-is and let the index pick up whatever
        // title it can parse.
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

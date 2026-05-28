import { Hono } from 'hono';
import { rename as fsRename, mkdir } from 'node:fs/promises';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { validateVaultRelativePath } from '../../tools/validation.js';
import type { VaultPaths } from '../../config/paths.js';
import type { Indexer } from '../../index/indexer.js';
import type { IndexRepo } from '../../index/repo.js';

function walkMarkdown(root: string, relBase: string): string[] {
  const out: string[] = [];
  const stack: string[] = [''];
  while (stack.length) {
    const rel = stack.pop()!;
    const abs = join(root, rel);
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        stack.push(childRel);
      } else if (entry.isFile() && childRel.toLowerCase().endsWith('.md')) {
        out.push(relBase ? `${relBase}/${childRel}` : childRel);
      }
    }
  }
  return out;
}

export function foldersRoute(deps: { paths: VaultPaths; repo?: IndexRepo; indexer?: Indexer }) {
  const r = new Hono();

  r.post('/api/folders/move', async (c) => {
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
    if (fromValid === toValid || toValid === `${fromValid}/` || toValid.startsWith(`${fromValid}/`)) {
      return c.json({ kind: 'api-error', code: 'INVALID_TARGET', message: 'to may not equal or be inside from' }, 400);
    }
    const fromAbs = join(deps.paths.vault, fromValid);
    const toAbs = join(deps.paths.vault, toValid);
    if (!existsSync(fromAbs) || !statSync(fromAbs).isDirectory()) {
      return c.json({ kind: 'api-error', code: 'NOT_FOUND', message: fromValid }, 404);
    }
    if (existsSync(toAbs)) {
      return c.json({ kind: 'api-error', code: 'TARGET_EXISTS', message: toValid }, 409);
    }
    try {
      await mkdir(dirname(toAbs), { recursive: true });
      await fsRename(fromAbs, toAbs);
    } catch (err) {
      return c.json({ kind: 'api-error', code: 'FS_FAILED', message: (err as Error).message }, 500);
    }
    if (deps.repo) {
      const movedPaths = walkMarkdown(toAbs, toValid);
      for (const newPath of movedPaths) {
        const oldPath = `${fromValid}/${newPath.slice(toValid.length + 1)}`;
        try {
          deps.repo.deleteNote(oldPath);
          if (deps.indexer) {
            await deps.indexer.indexFile(deps.paths.vault, newPath);
          }
        } catch (err) {
          process.stderr.write(`post-move index update failed for ${newPath}: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      }
    }
    return c.json({ from: fromValid, to: toValid });
  });

  return r;
}

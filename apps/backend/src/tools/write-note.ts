import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import type { Tool } from './types.js';

function validatePath(input: unknown): string {
  if (typeof input !== 'string') throw new Error("'path' must be a string");
  if (!input.length) throw new Error("'path' must not be empty");
  if (isAbsolute(input)) throw new Error("'path' must be relative to the vault root");
  if (input.split(/[\\/]/).some((seg) => seg === '..')) {
    throw new Error("'path' must not contain traversal segments ('..')");
  }
  return input;
}

function validateContent(input: unknown): string {
  if (typeof input !== 'string') throw new Error("'content' must be a string");
  return input;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export const writeNoteTool: Tool = {
  name: 'write_note',
  description:
    'Atomic write to a vault path. Snapshots any existing file to .sanji/versions/<path>.<unix-ts>.md before overwrite. Auto-creates parent directories. Returns JSON {path, snapshot, bytesWritten} where snapshot is null for new files.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Vault-relative path. Use forward slashes; cannot start with / or contain "..".',
      },
      content: {
        type: 'string',
        description: 'Full file body (frontmatter + markdown) to write atomically.',
      },
    },
    required: ['path', 'content'],
  },
  async run(input, ctx) {
    const path = validatePath(input.path);
    const content = validateContent(input.content);
    const abs = join(ctx.paths.vault, path);
    const tmp = `${abs}.tmp`;

    await mkdir(dirname(abs), { recursive: true });

    let snapshotRel: string | null = null;
    if (await fileExists(abs)) {
      const previous = await readFile(abs, 'utf8');
      const ts = Date.now();
      const snapshotAbs = join(ctx.paths.versionsDir, `${path}.${ts}.md`);
      await mkdir(dirname(snapshotAbs), { recursive: true });
      await writeFile(snapshotAbs, previous, 'utf8');
      snapshotRel = relative(ctx.paths.vault, snapshotAbs);
    }

    await writeFile(tmp, content, 'utf8');
    await rename(tmp, abs);

    return JSON.stringify({
      path,
      snapshot: snapshotRel,
      bytesWritten: Buffer.byteLength(content, 'utf8'),
    });
  },
};

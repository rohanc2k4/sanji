import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { validateVaultRelativePath } from './validation.js';
import type { Tool } from './types.js';

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

const FRONTMATTER_RE = /^---\s*\n[\s\S]*?\n---\s*\n?/;

/**
 * Pull the leading YAML frontmatter block (and its trailing newline) off
 * `source`. Returns null when the file does not start with `---`.
 */
function extractFrontmatterBlock(source: string): string | null {
  const match = source.match(FRONTMATTER_RE);
  return match ? match[0] : null;
}

/**
 * Guard against silent frontmatter loss when the chat agent (or notes editor)
 * overwrites an ingested note. If the existing file had a frontmatter block
 * and the incoming content does not, prepend the old block so identity
 * metadata (title, source, ingested_on, etc.) survives the write.
 */
function preserveFrontmatter(previous: string, next: string): string {
  if (!next.startsWith('---')) {
    const block = extractFrontmatterBlock(previous);
    if (block) {
      const sep = next.startsWith('\n') ? '' : '\n';
      return `${block}${sep}${next}`;
    }
  }
  return next;
}

export const writeNoteTool: Tool = {
  name: 'write_note',
  description:
    'Atomic write to a vault path. Snapshots any existing file to .sanji/versions/<path>.<unix-ts> before overwrite (preserving the original extension). Auto-creates parent directories. Returns JSON {path, snapshot, bytesWritten} — snapshot is the vault-relative snapshot path (null for new files).',
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
    const path = validateVaultRelativePath(input.path);
    const content = validateContent(input.content);
    const abs = join(ctx.paths.vault, path);
    const tmp = `${abs}.tmp`;

    await mkdir(dirname(abs), { recursive: true });

    let snapshotRel: string | null = null;
    let finalContent = content;
    if (await fileExists(abs)) {
      const previous = await readFile(abs, 'utf8');
      const ts = Date.now();
      const snapshotAbs = join(ctx.paths.versionsDir, `${path}.${ts}`);
      await mkdir(dirname(snapshotAbs), { recursive: true });
      await writeFile(snapshotAbs, previous, 'utf8');
      snapshotRel = relative(ctx.paths.vault, snapshotAbs);
      // If the caller forgot to include the existing frontmatter (common when
      // the chat agent rewrites a note body), keep the old block so identity
      // metadata isn't silently lost.
      finalContent = preserveFrontmatter(previous, content);
    }

    await writeFile(tmp, finalContent, 'utf8');
    await rename(tmp, abs);

    return JSON.stringify({
      path,
      snapshot: snapshotRel,
      bytesWritten: Buffer.byteLength(finalContent, 'utf8'),
    });
  },
};

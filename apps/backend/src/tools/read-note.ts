import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { parseNote } from '../vault/parse.js';
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

export const readNoteTool: Tool = {
  name: 'read_note',
  description:
    'Read a markdown note from the vault. Returns its title, frontmatter, and full body text as JSON.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Vault-relative path to a markdown file (e.g. "projects/argocd.md")',
      },
    },
    required: ['path'],
  },
  async run(input, ctx) {
    const path = validatePath(input.path);
    const abs = join(ctx.paths.vault, path);
    const source = await readFile(abs, 'utf8');
    const parsed = parseNote(path, source, 0);
    return JSON.stringify({
      path: parsed.note.path,
      title: parsed.note.title,
      frontmatter: parsed.note.frontmatter,
      body: parsed.note.body,
    });
  },
};

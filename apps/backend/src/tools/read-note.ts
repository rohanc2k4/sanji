import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseNote } from '../vault/parse.js';
import { validateVaultRelativePath } from './validation.js';
import type { Tool } from './types.js';

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
    const path = validateVaultRelativePath(input.path);
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

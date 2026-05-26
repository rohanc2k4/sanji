import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from './types.js';
import { validateVaultRelativePath } from './validation.js';

const SKIP = new Set(['.sanji', '.git', 'node_modules']);
const MAX_ENTRIES = 5000;

export const listVaultTool: Tool = {
  name: 'list_vault',
  description:
    "List the immediate contents of a folder inside the vault. Default folder is the vault root. Returns folders and .md files with type and basic metadata (size, mtime). Skips .sanji, .git, node_modules, and dotfiles. Capped at 5000 entries. Use this to orient yourself before grepping or to see folder structure.",
  inputSchema: {
    type: 'object',
    properties: {
      folder: {
        type: 'string',
        description: 'Vault-relative folder path. Empty or omitted means vault root.',
      },
    },
  },
  async run(input, ctx) {
    const raw = (input.folder as string | undefined)?.trim() || '';
    const safe = raw ? validateVaultRelativePath(raw) : '';
    const abs = safe ? join(ctx.paths.vault, safe) : ctx.paths.vault;
    const entries = readdirSync(abs, { withFileTypes: true });
    const out: Array<{ path: string; type: 'file' | 'folder'; size?: number; mtime?: string }> = [];
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      if (e.name.startsWith('.')) continue;
      const rel = safe ? `${safe}/${e.name}` : e.name;
      if (e.isDirectory()) {
        out.push({ path: rel, type: 'folder' });
      } else if (e.isFile() && e.name.endsWith('.md')) {
        const st = statSync(join(abs, e.name));
        out.push({
          path: rel,
          type: 'file',
          size: st.size,
          mtime: st.mtime.toISOString(),
        });
      }
      if (out.length >= MAX_ENTRIES) break;
    }
    out.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
    return JSON.stringify(out);
  },
};

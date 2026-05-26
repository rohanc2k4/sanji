import type { Tool } from './types.js';
import { validateVaultRelativePath } from './validation.js';
import { hasRipgrep } from './grep-vault-detect.js';
import { rgGrep } from './grep-vault-rg.js';
import { nodeGrep } from './grep-vault-node.js';

const DEFAULT_MAX = 50;
const HARD_MAX = 500;

export const grepVaultTool: Tool = {
  name: 'grep_vault',
  description:
    'Run a pattern (regex or literal) against all .md files in the vault. Returns up to N matches as JSON, each {path, line, text}. Use this as your primary retrieval tool for vault questions. Iterate with different patterns when one comes up empty.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex or literal string to search for.' },
      folder: { type: 'string', description: 'Optional vault-relative folder to scope the search.' },
      case_sensitive: { type: 'boolean', description: 'Default false.' },
      max_results: { type: 'number', description: 'Default 50, capped at 500.' },
    },
    required: ['pattern'],
  },
  async run(input, ctx) {
    const pattern = String(input.pattern ?? '').trim();
    if (!pattern) throw new Error("'pattern' must not be empty");
    const folder = (input.folder as string | undefined)?.trim();
    const safeFolder = folder ? validateVaultRelativePath(folder) : undefined;
    const caseSensitive = !!input.case_sensitive;
    const maxResults = Math.min(
      HARD_MAX,
      Math.max(1, Math.floor(Number(input.max_results ?? DEFAULT_MAX))),
    );
    const opts = {
      vaultRoot: ctx.paths.vault,
      pattern,
      ...(safeFolder ? { folder: safeFolder } : {}),
      caseSensitive,
      maxResults,
    };
    const matches = hasRipgrep() ? await rgGrep(opts) : await nodeGrep(opts);
    return JSON.stringify(matches);
  },
};

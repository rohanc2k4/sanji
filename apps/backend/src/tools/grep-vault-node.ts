import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GrepMatch, GrepOpts } from './grep-vault-rg.js';

const SKIP = new Set(['.sanji', '.git', 'node_modules']);

async function walk(root: string, rel: string, into: string[]): Promise<void> {
  const entries = await readdir(join(root, rel), { withFileTypes: true });
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) await walk(root, childRel, into);
    else if (e.isFile() && e.name.endsWith('.md')) into.push(childRel);
  }
}

/**
 * Pure-Node fallback when ripgrep isn't on PATH. Walks the vault, skipping
 * dotdirs / .sanji / .git / node_modules, applies the pattern as a regex
 * (or falls back to literal substring if the regex won't compile), and
 * collects matches up to maxResults.
 *
 * Slower than rg by an order of magnitude but functionally equivalent for
 * the small vaults Sanji v0.1 targets.
 */
export async function nodeGrep(opts: GrepOpts): Promise<GrepMatch[]> {
  const matches: GrepMatch[] = [];
  let re: RegExp | null = null;
  try {
    re = new RegExp(opts.pattern, opts.caseSensitive ? '' : 'i');
  } catch {
    re = null;
  }

  const files: string[] = [];
  await walk(opts.vaultRoot, opts.folder || '', files);

  if (re) {
    for (const f of files) {
      if (matches.length >= opts.maxResults) break;
      const content = await readFile(join(opts.vaultRoot, f), 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (re.test(line)) {
          matches.push({ path: f, line: i + 1, text: line });
          if (matches.length >= opts.maxResults) break;
        }
      }
    }
    return matches;
  }

  // Literal substring fallback.
  const literal = opts.pattern;
  const lower = literal.toLowerCase();
  for (const f of files) {
    if (matches.length >= opts.maxResults) break;
    const content = await readFile(join(opts.vaultRoot, f), 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const hay = opts.caseSensitive ? line : line.toLowerCase();
      const needle = opts.caseSensitive ? literal : lower;
      if (hay.includes(needle)) {
        matches.push({ path: f, line: i + 1, text: line });
        if (matches.length >= opts.maxResults) break;
      }
    }
  }
  return matches;
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { grepVaultTool } from './grep-vault.js';

describe('grep_vault tool', () => {
  let vault: string;
  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'sanji-grep-'));
    mkdirSync(join(vault, 'cmsc416'));
    writeFileSync(join(vault, 'README.md'), 'logistic regression overview\n');
    writeFileSync(join(vault, 'cmsc416', 'lecture.md'), 'SGD updates\nlogistic regression\n');
    writeFileSync(join(vault, 'cmsc416', 'unrelated.md'), 'random walks\n');
  });
  afterEach(() => rmSync(vault, { recursive: true, force: true }));

  it('returns matches with path, line, text', async () => {
    const out = JSON.parse(
      await grepVaultTool.run({ pattern: 'logistic regression' }, { paths: { vault } } as any),
    );
    expect(out.length).toBeGreaterThanOrEqual(2);
    const paths = new Set(out.map((m: any) => m.path));
    expect(paths.has('README.md')).toBe(true);
    expect(paths.has('cmsc416/lecture.md')).toBe(true);
    expect(out[0].line).toBeGreaterThan(0);
    expect(out[0].text.toLowerCase()).toContain('logistic');
  });

  it('honors folder scope', async () => {
    const out = JSON.parse(
      await grepVaultTool.run({ pattern: 'logistic', folder: 'cmsc416' }, { paths: { vault } } as any),
    );
    expect(out.every((m: any) => m.path.startsWith('cmsc416/'))).toBe(true);
  });

  it('respects max_results cap', async () => {
    const out = JSON.parse(
      await grepVaultTool.run({ pattern: 'a', max_results: 3 }, { paths: { vault } } as any),
    );
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it('rejects path traversal in folder', async () => {
    await expect(
      grepVaultTool.run({ pattern: 'x', folder: '../escape' }, { paths: { vault } } as any),
    ).rejects.toThrow();
  });

  it('returns empty array for no matches', async () => {
    const out = JSON.parse(
      await grepVaultTool.run({ pattern: 'definitely-not-in-the-vault-xyz' }, { paths: { vault } } as any),
    );
    expect(out).toEqual([]);
  });

  it('rejects empty pattern', async () => {
    await expect(grepVaultTool.run({ pattern: '' }, { paths: { vault } } as any)).rejects.toThrow();
    await expect(grepVaultTool.run({ pattern: '   ' }, { paths: { vault } } as any)).rejects.toThrow();
  });
});

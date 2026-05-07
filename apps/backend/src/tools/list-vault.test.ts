import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listVaultTool } from './list-vault.js';

describe('list_vault tool', () => {
  let vault: string;
  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'sanji-list-'));
    mkdirSync(join(vault, 'cmsc416'));
    mkdirSync(join(vault, 'math401'));
    mkdirSync(join(vault, '.sanji', 'originals'), { recursive: true });
    writeFileSync(join(vault, 'README.md'), '# Vault');
    writeFileSync(join(vault, 'cmsc416', 'lecture1.md'), '# L1');
    writeFileSync(join(vault, '.sanji', 'originals', 'paper.pdf'), 'binary');
  });
  afterEach(() => rmSync(vault, { recursive: true, force: true }));

  it('lists folders + .md files at vault root, skips .sanji', async () => {
    const out = JSON.parse(await listVaultTool.run({ folder: undefined }, { paths: { vault } } as any));
    const names = out.map((e: any) => e.path);
    expect(names).toContain('README.md');
    expect(names).toContain('cmsc416');
    expect(names).toContain('math401');
    expect(names.some((n: string) => n.startsWith('.sanji'))).toBe(false);
  });

  it('lists contents of a subfolder', async () => {
    const out = JSON.parse(await listVaultTool.run({ folder: 'cmsc416' }, { paths: { vault } } as any));
    expect(out.map((e: any) => e.path)).toContain('cmsc416/lecture1.md');
  });

  it('rejects path traversal', async () => {
    await expect(listVaultTool.run({ folder: '../escape' }, { paths: { vault } } as any)).rejects.toThrow();
  });

  it('sorts folders before files, alphabetically within each group', async () => {
    const out = JSON.parse(await listVaultTool.run({ folder: undefined }, { paths: { vault } } as any));
    const types = out.map((e: any) => e.type);
    const lastFolderIdx = types.lastIndexOf('folder');
    const firstFileIdx = types.indexOf('file');
    expect(lastFolderIdx).toBeLessThan(firstFileIdx);
  });
});

import { describe, expect, it } from 'vitest';
import { resolveVaultPaths } from './paths.js';

describe('resolveVaultPaths', () => {
  it('builds .sanji/* paths under the vault', () => {
    const p = resolveVaultPaths('/abs/notes');
    expect(p.vault).toBe('/abs/notes');
    expect(p.sanjiDir).toBe('/abs/notes/.sanji');
    expect(p.configFile).toBe('/abs/notes/.sanji/config.toml');
    expect(p.indexDb).toBe('/abs/notes/.sanji/index.db');
    expect(p.skillsDir).toBe('/abs/notes/.sanji/skills');
    expect(p.versionsDir).toBe('/abs/notes/.sanji/versions');
    expect(p.modelCacheDir).toBe('/abs/notes/.sanji/model-cache');
  });

  it('resolves a relative vault path against cwd', () => {
    const p = resolveVaultPaths('./notes');
    expect(p.vault.startsWith('/')).toBe(true);
    expect(p.sanjiDir.endsWith('/notes/.sanji')).toBe(true);
  });

  it('expands ~ to the home directory', () => {
    const p = resolveVaultPaths('~/notes');
    expect(p.vault).toMatch(/^\/.+\/notes$/);
    expect(p.vault.includes('~')).toBe(false);
  });
});

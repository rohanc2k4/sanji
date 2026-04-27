import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it, afterEach } from 'vitest';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { loadOrInitConfig } from './loader.js';
import { resolveVaultPaths } from './paths.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function tmpVault() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  return dir;
}

describe('loadOrInitConfig', () => {
  it('writes a default config.toml on first run and returns parsed config', () => {
    const vault = tmpVault();
    const cfg = loadOrInitConfig(resolveVaultPaths(vault));
    expect(cfg.provider.mode).toBe('claude-code');
    expect(cfg.models.default).toBe('claude-sonnet-4-6');
  });

  it('reads an existing config.toml on subsequent runs', () => {
    const vault = tmpVault();
    const paths = resolveVaultPaths(vault);
    mkdirSync(paths.sanjiDir, { recursive: true });
    writeFileSync(paths.configFile, '[provider]\nmode = "anthropic-api"\n');
    const cfg = loadOrInitConfig(paths);
    expect(cfg.provider.mode).toBe('anthropic-api');
  });

  it('throws ZodError on a malformed config', () => {
    const vault = tmpVault();
    const paths = resolveVaultPaths(vault);
    mkdirSync(paths.sanjiDir, { recursive: true });
    writeFileSync(paths.configFile, '[provider]\nmode = "openai"\n');
    expect(() => loadOrInitConfig(paths)).toThrow();
  });
});

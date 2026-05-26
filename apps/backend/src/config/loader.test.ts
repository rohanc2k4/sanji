import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it, afterEach } from 'vitest';
import { parseConfig } from '@sanji/shared';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { loadOrInitConfig, saveConfig } from './loader.js';
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

describe('parseConfig [chat] section', () => {
  it('parses [chat] section with defaults when absent', () => {
    const cfg = parseConfig(`
[provider]
mode = "claude-code"
[ingestion]
contextual_retrieval = false
`);
    expect(cfg.chat.autoClearThreshold).toBe(0.75);
    expect(cfg.chat.autoClearIdleMinutes).toBe(30);
  });

  it('honors user-provided [chat] values', () => {
    const cfg = parseConfig(`
[provider]
mode = "claude-code"
[ingestion]
contextual_retrieval = false
[chat]
auto_clear_threshold = 0.85
auto_clear_idle_minutes = 60
`);
    expect(cfg.chat.autoClearThreshold).toBe(0.85);
    expect(cfg.chat.autoClearIdleMinutes).toBe(60);
  });

  it('clamps threshold to [0,1] and idle to a positive number', () => {
    const cfg = parseConfig(`
[provider]
mode = "claude-code"
[ingestion]
contextual_retrieval = false
[chat]
auto_clear_threshold = 2.0
auto_clear_idle_minutes = -5
`);
    expect(cfg.chat.autoClearThreshold).toBe(1.0);
    expect(cfg.chat.autoClearIdleMinutes).toBe(1);
  });
});

describe('saveConfig', () => {
  it('round-trips through load → save → load with preserved values', () => {
    const vault = tmpVault();
    const paths = resolveVaultPaths(vault);
    const cfg = loadOrInitConfig(paths);
    cfg.models.default = 'claude-opus-4-7';
    cfg.ui.theme = 'dark';
    cfg.calendar.poll_interval_minutes = 15;
    saveConfig(paths, cfg);
    const reloaded = loadOrInitConfig(paths);
    expect(reloaded.models.default).toBe('claude-opus-4-7');
    expect(reloaded.ui.theme).toBe('dark');
    expect(reloaded.calendar.poll_interval_minutes).toBe(15);
    expect(reloaded.provider.mode).toBe('claude-code');
  });
});

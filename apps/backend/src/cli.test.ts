import { describe, expect, it, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm } from 'node:fs/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const exec = promisify(execFile);
const FIXTURE_VAULT = join(HERE, '../tests/fixtures/vault');

afterEach(async () => {
  await rm(join(FIXTURE_VAULT, '.sanji'), { recursive: true, force: true });
});

async function runCli(args: string[], extraEnv: Record<string, string> = {}) {
  return exec('pnpm', ['--silent', 'sanji', ...args], {
    cwd: join(HERE, '..'),
    env: { ...process.env, SANJI_FAKE_EMBED: '1', ...extraEnv },
  });
}

describe('sanji CLI', () => {
  it('init creates .sanji/config.toml and an empty index.db', async () => {
    const { stdout } = await runCli(['--vault', FIXTURE_VAULT, 'init']);
    expect(stdout).toMatch(/initialized/i);
  });

  it('index walks the vault and prints stats', async () => {
    await runCli(['--vault', FIXTURE_VAULT, 'init']);
    const { stdout } = await runCli(['--vault', FIXTURE_VAULT, 'index']);
    expect(stdout).toMatch(/notes: 6/);
    expect(stdout).toMatch(/chunks:/);
  });

  it('search returns FTS5 hits', async () => {
    await runCli(['--vault', FIXTURE_VAULT, 'init']);
    await runCli(['--vault', FIXTURE_VAULT, 'index']);
    const { stdout } = await runCli(['--vault', FIXTURE_VAULT, 'search', 'argocd']);
    expect(stdout).toMatch(/argocd|policy/i);
  });

  it('ssearch returns vec0 hits', async () => {
    await runCli(['--vault', FIXTURE_VAULT, 'init']);
    await runCli(['--vault', FIXTURE_VAULT, 'index']);
    const { stdout } = await runCli(['--vault', FIXTURE_VAULT, 'ssearch', 'deployment']);
    expect(stdout).toMatch(/distance/);
  });

  it('ask prints final stats line including the resolved skill name', async () => {
    await runCli(['--vault', FIXTURE_VAULT, 'init']);
    const { stdout } = await runCli(
      ['--vault', FIXTURE_VAULT, 'ask', 'what does the daily note say about argocd?'],
      { SANJI_OFFLINE_FAKE_LLM: '1' },
    );
    expect(stdout).toMatch(/skill: ask/);
  });

  it('ask routes /recap to the recap skill', async () => {
    await runCli(['--vault', FIXTURE_VAULT, 'init']);
    const { stdout } = await runCli(
      ['--vault', FIXTURE_VAULT, 'ask', '/recap projects/argocd.md'],
      { SANJI_OFFLINE_FAKE_LLM: '1' },
    );
    expect(stdout).toMatch(/skill: recap/);
  });
});

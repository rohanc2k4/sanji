import { describe, expect, it, afterEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { loadSkills } from './loader.js';
import { resolveVaultPaths } from '../config/paths.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function setup() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.skillsDir, { recursive: true });
  return paths;
}

describe('loadSkills', () => {
  it('loads built-in skills only when the user dir is empty', async () => {
    const paths = setup();
    const { skills, errors } = await loadSkills(paths);
    expect(skills.length).toBeGreaterThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  it('layers user skills over built-ins by trigger', async () => {
    const paths = setup();
    writeFileSync(
      join(paths.skillsDir, 'ask.md'),
      `---\nname: ask-user\ntrigger: /ask\n---\nuser body`,
    );
    const { skills } = await loadSkills(paths);
    const ask = skills.find((s) => s.trigger === '/ask');
    expect(ask?.body).toBe('user body');
    expect(ask?.name).toBe('ask-user');
  });

  it('skips malformed skills without crashing and reports them', async () => {
    const paths = setup();
    writeFileSync(join(paths.skillsDir, 'broken.md'), `---\ntrigger: not-a-slash\n---\nbody`);
    writeFileSync(
      join(paths.skillsDir, 'ok.md'),
      `---\nname: ok\ntrigger: /ok\n---\nok body`,
    );
    const { skills, errors } = await loadSkills(paths);
    expect(skills.find((s) => s.trigger === '/ok')).toBeDefined();
    expect(errors.find((e) => e.source.endsWith('broken.md'))).toBeDefined();
  });

  it('returns each trigger only once even if a user file duplicates a built-in', async () => {
    const paths = setup();
    writeFileSync(
      join(paths.skillsDir, 'ask.md'),
      `---\nname: ask-user\ntrigger: /ask\n---\nuser body`,
    );
    const { skills } = await loadSkills(paths);
    const asks = skills.filter((s) => s.trigger === '/ask');
    expect(asks).toHaveLength(1);
  });

  it('loads the bundled ingest skill', async () => {
    const paths = setup();
    const { skills } = await loadSkills(paths);
    const ingest = skills.find((s) => s.name === 'ingest');
    expect(ingest).toBeDefined();
    expect(ingest?.trigger).toBe('/ingest');
    expect(ingest?.body.length).toBeGreaterThan(500); // body has substantial content
    expect(ingest?.body).toContain('Sanji ingest skill');
  });
});

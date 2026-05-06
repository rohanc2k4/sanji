import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveVaultPaths } from '../config/paths.js';
import { loadSkills } from './loader.js';

describe('built-in skills', () => {
  it('loads /ask, /recap, /connect, /ingest with valid frontmatter', async () => {
    const paths = resolveVaultPaths(mkdtempSync(join(tmpdir(), 'sanji-builtins-')));
    const { skills, errors } = await loadSkills(paths);
    expect(errors).toEqual([]);
    const triggers = skills.map((s) => s.trigger).sort();
    expect(triggers).toEqual(['/ask', '/connect', '/ingest', '/recap']);

    const ask = skills.find((s) => s.trigger === '/ask')!;
    expect(ask.tools).toContain('search_vault');
    expect(ask.tools).toContain('semantic_search');
    expect(ask.tools).toContain('read_note');

    const recap = skills.find((s) => s.trigger === '/recap')!;
    expect(recap.tools).toContain('read_note');

    const connect = skills.find((s) => s.trigger === '/connect')!;
    expect(connect.tools).toContain('get_neighbors');

    const ingest = skills.find((s) => s.trigger === '/ingest')!;
    expect(ingest.name).toBe('ingest');
    expect(ingest.tools).toEqual([]);
  });
});

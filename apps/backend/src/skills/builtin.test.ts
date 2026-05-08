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
    // RAG fallback tools (hybrid_search, search_vault, semantic_search) temporarily
    // removed to evaluate pure agentic search behavior. Restore by re-listing them
    // in apps/backend/src/skills/builtin/ask.md frontmatter.
    expect(ask.tools).toContain('list_vault');
    expect(ask.tools).toContain('grep_vault');
    expect(ask.tools).toContain('read_note');
    expect(ask.tools).not.toContain('hybrid_search');
    expect(ask.tools).not.toContain('semantic_search');
    expect(ask.tools).not.toContain('search_vault');

    const recap = skills.find((s) => s.trigger === '/recap')!;
    expect(recap.tools).toContain('read_note');

    const connect = skills.find((s) => s.trigger === '/connect')!;
    expect(connect.tools).toContain('get_neighbors');

    const ingest = skills.find((s) => s.trigger === '/ingest')!;
    expect(ingest.name).toBe('ingest');
    expect(ingest.tools).toEqual([]);
  });
});

import { describe, expect, it, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { IndexRepo } from '../index/repo.js';
import { resolveVaultPaths } from '../config/paths.js';
import { searchVaultTool } from './search-vault.js';
import type { ToolContext } from './types.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function setup() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  const repo = new IndexRepo(db);
  repo.upsertNote({
    path: 'projects/argocd.md',
    mtimeMs: 1,
    body: 'argocd pipeline notes about deployment to eks05',
    frontmatter: null,
    title: 'ArgoCD',
  });
  repo.upsertNote({
    path: 'context/orgs/verrus.md',
    mtimeMs: 1,
    body: 'Verrus is a data center company',
    frontmatter: null,
    title: 'Verrus',
  });
  repo.upsertNote({
    path: 'daily.md',
    mtimeMs: 1,
    body: 'today met about argocd and the policy server',
    frontmatter: null,
    title: null,
  });
  const ctx: ToolContext = {
    paths: resolveVaultPaths(dir),
    db,
    repo,
    embedder: null as never,
  };
  return { ctx };
}

describe('searchVaultTool', () => {
  it('returns FTS5 hits as JSON array of {path, title, snippet}', async () => {
    const { ctx } = setup();
    const out = await searchVaultTool.run({ query: 'argocd' }, ctx);
    const hits = JSON.parse(out);
    expect(Array.isArray(hits)).toBe(true);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]).toHaveProperty('path');
    expect(hits[0]).toHaveProperty('title');
    expect(hits[0]).toHaveProperty('snippet');
    const paths = hits.map((h: { path: string }) => h.path);
    expect(paths).toContain('projects/argocd.md');
    expect(paths).toContain('daily.md');
  });

  it('respects an explicit limit', async () => {
    const { ctx } = setup();
    const out = await searchVaultTool.run({ query: 'argocd', limit: 1 }, ctx);
    expect(JSON.parse(out)).toHaveLength(1);
  });

  it('returns empty array for query with no matches', async () => {
    const { ctx } = setup();
    const out = await searchVaultTool.run({ query: 'xyzzyabc' }, ctx);
    expect(JSON.parse(out)).toEqual([]);
  });

  it('throws on empty or non-string query', async () => {
    const { ctx } = setup();
    await expect(searchVaultTool.run({ query: '' }, ctx)).rejects.toThrow(/query/);
    await expect(searchVaultTool.run({}, ctx)).rejects.toThrow(/query/);
    await expect(
      searchVaultTool.run({ query: 5 as unknown as string }, ctx),
    ).rejects.toThrow(/query/);
  });

  it('caps limit at 25', async () => {
    const { ctx } = setup();
    // Seed 30 more notes that all match 'fizz'
    const repo = ctx.repo;
    for (let i = 0; i < 30; i++) {
      repo.upsertNote({
        path: `n${i}.md`,
        mtimeMs: 1,
        body: 'fizz buzz',
        frontmatter: null,
        title: null,
      });
    }
    const out = await searchVaultTool.run({ query: 'fizz', limit: 999 }, ctx);
    expect(JSON.parse(out).length).toBe(25);
  });
});

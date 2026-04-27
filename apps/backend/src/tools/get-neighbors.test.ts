import { describe, expect, it, afterEach } from 'vitest';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { openDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { IndexRepo } from '../index/repo.js';
import { resolveVaultPaths } from '../config/paths.js';
import { getNeighborsTool } from './get-neighbors.js';
import type { ToolContext } from './types.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function setup() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const db = openDb(join(dir, 'index.db'));
  runMigrations(db);
  const repo = new IndexRepo(db);
  const ctx: ToolContext = {
    paths: resolveVaultPaths(dir),
    db,
    repo,
    embedder: null as never,
  };
  return { ctx, repo };
}

function seed(repo: IndexRepo, path: string, links: string[]) {
  repo.upsertNote({ path, mtimeMs: 1, body: '', frontmatter: null, title: null });
  if (links.length) {
    repo.replaceLinksForSource(
      path,
      links.map((slug) => ({ sourcePath: path, targetSlug: slug, occurrenceCount: 1 })),
    );
  }
}

describe('getNeighborsTool', () => {
  it('returns direct outbound neighbors at depth 1', async () => {
    const { ctx, repo } = setup();
    seed(repo, 'a.md', ['b']);
    seed(repo, 'b.md', []);
    const out = await getNeighborsTool.run({ path: 'a.md', depth: 1 }, ctx);
    const r = JSON.parse(out);
    expect(r.path).toBe('a.md');
    expect(r.depth).toBe(1);
    expect(r.nodes).toContainEqual({ path: 'b.md', hops: 1, kind: 'outbound' });
  });

  it('returns inbound (backlinks) at depth 1', async () => {
    const { ctx, repo } = setup();
    seed(repo, 'a.md', ['b']);
    seed(repo, 'b.md', []);
    const out = await getNeighborsTool.run({ path: 'b.md', depth: 1 }, ctx);
    const r = JSON.parse(out);
    expect(r.nodes).toContainEqual({ path: 'a.md', hops: 1, kind: 'inbound' });
  });

  it('walks to depth 2 with hops counted correctly', async () => {
    const { ctx, repo } = setup();
    seed(repo, 'a.md', ['b']);
    seed(repo, 'b.md', ['c']);
    seed(repo, 'c.md', []);
    const out = await getNeighborsTool.run({ path: 'a.md', depth: 2 }, ctx);
    const r = JSON.parse(out);
    const nodes: Array<{ path: string; hops: number; kind: string }> = r.nodes;
    expect(nodes.find((n) => n.path === 'b.md')?.hops).toBe(1);
    expect(nodes.find((n) => n.path === 'c.md')?.hops).toBe(2);
  });

  it('handles cycles without revisiting nodes', async () => {
    const { ctx, repo } = setup();
    seed(repo, 'a.md', ['b']);
    seed(repo, 'b.md', ['a']);
    const out = await getNeighborsTool.run({ path: 'a.md', depth: 2 }, ctx);
    const r = JSON.parse(out);
    const nodes: Array<{ path: string }> = r.nodes;
    expect(nodes.find((n) => n.path === 'a.md')).toBeUndefined();
    expect(nodes.filter((n) => n.path === 'b.md')).toHaveLength(1);
  });

  it('rejects invalid depth', async () => {
    const { ctx, repo } = setup();
    seed(repo, 'a.md', []);
    await expect(
      getNeighborsTool.run({ path: 'a.md', depth: 3 }, ctx),
    ).rejects.toThrow(/depth/);
    await expect(
      getNeighborsTool.run({ path: 'a.md', depth: 0 }, ctx),
    ).rejects.toThrow(/depth/);
  });

  it('rejects bad path', async () => {
    const { ctx } = setup();
    await expect(getNeighborsTool.run({}, ctx)).rejects.toThrow(/path/);
    await expect(getNeighborsTool.run({ path: '' }, ctx)).rejects.toThrow(/path/);
  });

  it('resolves slugs against note basenames (Obsidian-style)', async () => {
    const { ctx, repo } = setup();
    // Note at projects/argocd.md, but linked via [[argocd]] (basename only)
    seed(repo, 'projects/argocd.md', []);
    seed(repo, 'daily.md', ['argocd']);
    const out = await getNeighborsTool.run({ path: 'projects/argocd.md', depth: 1 }, ctx);
    const r = JSON.parse(out);
    expect(r.nodes).toContainEqual({ path: 'daily.md', hops: 1, kind: 'inbound' });
  });
});

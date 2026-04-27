import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNoteTool } from './read-note.js';
import { resolveVaultPaths } from '../config/paths.js';
import type { ToolContext } from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_VAULT = join(HERE, '../../tests/fixtures/vault');

function ctxFor(vault: string): ToolContext {
  return {
    paths: resolveVaultPaths(vault),
    db: null as never,
    repo: null as never,
    embedder: null as never,
  };
}

describe('readNoteTool', () => {
  it('reads a note with frontmatter and returns parsed JSON', async () => {
    const out = await readNoteTool.run({ path: 'projects/argocd.md' }, ctxFor(FIXTURE_VAULT));
    const parsed = JSON.parse(out);
    expect(parsed.path).toBe('projects/argocd.md');
    expect(parsed.title).toBe('ArgoCD pipeline');
    expect(parsed.frontmatter).toMatchObject({ type: 'project' });
    expect(parsed.body).toContain('eks05');
  });

  it('reads a note without frontmatter and uses H1 as title', async () => {
    const out = await readNoteTool.run({ path: 'unicode.md' }, ctxFor(FIXTURE_VAULT));
    const parsed = JSON.parse(out);
    expect(parsed.title).toContain('Unicode');
    expect(parsed.frontmatter).toBeNull();
  });

  it('rejects absolute paths', async () => {
    await expect(
      readNoteTool.run({ path: '/etc/passwd' }, ctxFor(FIXTURE_VAULT)),
    ).rejects.toThrow(/relative/);
  });

  it('rejects path traversal', async () => {
    await expect(
      readNoteTool.run({ path: '../../etc/passwd' }, ctxFor(FIXTURE_VAULT)),
    ).rejects.toThrow(/traversal/);
  });

  it('errors on missing file', async () => {
    await expect(
      readNoteTool.run({ path: 'nope.md' }, ctxFor(FIXTURE_VAULT)),
    ).rejects.toThrow();
  });

  it('errors when path is missing or wrong type', async () => {
    await expect(readNoteTool.run({}, ctxFor(FIXTURE_VAULT))).rejects.toThrow(/path/);
    await expect(
      readNoteTool.run({ path: 123 as unknown as string }, ctxFor(FIXTURE_VAULT)),
    ).rejects.toThrow(/path/);
  });
});

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { notesRoute, syncTitleToFilename } from './notes.js';
import { resolveVaultPaths } from '../../config/paths.js';
import { openDb } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { IndexRepo } from '../../index/repo.js';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sanji-notes-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function mount() {
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(':memory:');
  runMigrations(db);
  const repo = new IndexRepo(db);
  const app = new Hono();
  app.route('/', notesRoute({ paths, repo }));
  return { app, paths, repo };
}

describe('syncTitleToFilename', () => {
  it('rewrites frontmatter title and first H1', () => {
    const out = syncTitleToFilename(
      '---\ntitle: foo\nsource: x\n---\n\n# foo\n\nbody\n',
      'bar',
    );
    expect(out).toContain('title: bar');
    expect(out).toContain('source: x');
    expect(out).toContain('# bar');
    expect(out).not.toMatch(/^title: foo$/m);
  });

  it('only rewrites the first H1, not subsequent ones', () => {
    const out = syncTitleToFilename(
      '---\ntitle: a\n---\n\n# a\n\n## sub\n\n# a\n',
      'b',
    );
    // First H1 became "# b"; the later "# a" stays.
    expect(out).toMatch(/# b\n\n## sub\n\n# a\n$/);
  });

  it('quotes titles with special YAML characters', () => {
    const out = syncTitleToFilename('---\ntitle: a\n---\n\nbody', 'has: colon');
    expect(out).toMatch(/title: "has: colon"/);
  });

  it('is a no-op when there is no frontmatter title or H1', () => {
    const src = 'plain prose\nno markers\n';
    expect(syncTitleToFilename(src, 'whatever')).toBe(src);
  });
});

describe('notes route', () => {
  it('GET /api/notes/* returns parsed note', async () => {
    writeFileSync(join(dir, 'a.md'), '---\ntitle: A\n---\nbody');
    const { app } = mount();
    const res = await app.request('/api/notes/a.md');
    expect(res.status).toBe(200);
    const body = await res.json() as { path: string; title: string | null; body: string };
    expect(body.path).toBe('a.md');
    expect(body.title).toBe('A');
    expect(body.body.trim()).toBe('body');
  });

  it('GET /api/notes/* 404s on missing', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes/missing.md');
    expect(res.status).toBe(404);
  });

  it('PUT /api/notes/* writes atomically and snapshots', async () => {
    writeFileSync(join(dir, 'a.md'), 'old');
    const { app } = mount();
    const res = await app.request('/api/notes/a.md', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'new' }),
    });
    expect(res.status).toBe(200);
    expect(readFileSync(join(dir, 'a.md'), 'utf8')).toBe('new');
  });

  it('rejects path traversal', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes/..%2Fescape.md');
    expect(res.status).toBe(400);
  });

  it('PUT upserts the saved note into the index so the sidebar can see it', async () => {
    const { app, repo } = mount();
    const res = await app.request('/api/notes/inbox/new.md', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '---\ntitle: New\n---\nhello' }),
    });
    expect(res.status).toBe(200);
    const indexed = repo.getNote('inbox/new.md');
    expect(indexed).not.toBeNull();
    expect(indexed?.title).toBe('New');
  });

  it('POST /api/notes/rename moves the file on disk and updates the index', async () => {
    writeFileSync(join(dir, 'old.md'), '---\ntitle: Old\n---\nbody');
    const { app, repo, paths } = mount();
    // Seed the index so we can verify the swap.
    repo.upsertNote({
      path: 'old.md',
      mtimeMs: Date.now(),
      body: 'body',
      frontmatter: { title: 'Old' },
      title: 'Old',
    });

    const res = await app.request('/api/notes/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'old.md', to: 'inbox/new.md' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { from: string; to: string };
    expect(body).toEqual({ from: 'old.md', to: 'inbox/new.md' });
    expect(readFileSync(join(paths.vault, 'inbox/new.md'), 'utf8')).toContain('body');
    expect(repo.getNote('old.md')).toBeNull();
    // Rename also syncs frontmatter title to the new filename basename.
    expect(repo.getNote('inbox/new.md')?.title).toBe('new');
  });

  it('POST /api/notes/rename syncs frontmatter title and H1 to the new filename', async () => {
    writeFileSync(
      join(dir, 'foo.md'),
      '---\ntitle: foo\n---\n\n# foo\n\ncontent\n',
    );
    const { app, repo, paths } = mount();
    repo.upsertNote({
      path: 'foo.md',
      mtimeMs: Date.now(),
      body: '# foo\n\ncontent',
      frontmatter: { title: 'foo' },
      title: 'foo',
    });

    const res = await app.request('/api/notes/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'foo.md', to: 'bar.md' }),
    });
    expect(res.status).toBe(200);

    const onDisk = readFileSync(join(paths.vault, 'bar.md'), 'utf8');
    expect(onDisk).toContain('title: bar');
    expect(onDisk).not.toMatch(/^title: foo$/m);
    expect(onDisk).toContain('# bar');
    expect(onDisk).not.toMatch(/^# foo$/m);
    expect(onDisk).toContain('content');

    expect(repo.getNote('bar.md')?.title).toBe('bar');
  });

  it('POST /api/notes/rename leaves body untouched when no frontmatter title or H1 is present', async () => {
    writeFileSync(join(dir, 'a.md'), 'just plain text\nno headers here\n');
    const { app, paths } = mount();

    const res = await app.request('/api/notes/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'a.md', to: 'b.md' }),
    });
    expect(res.status).toBe(200);
    expect(readFileSync(join(paths.vault, 'b.md'), 'utf8')).toBe(
      'just plain text\nno headers here\n',
    );
  });

  it('POST /api/notes/rename 404s when source missing, 409s when target exists', async () => {
    writeFileSync(join(dir, 'a.md'), 'a');
    writeFileSync(join(dir, 'b.md'), 'b');
    const { app } = mount();

    const missing = await app.request('/api/notes/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'gone.md', to: 'somewhere.md' }),
    });
    expect(missing.status).toBe(404);

    const collision = await app.request('/api/notes/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'a.md', to: 'b.md' }),
    });
    expect(collision.status).toBe(409);
  });
});

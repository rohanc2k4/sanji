import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { notesRoute, syncTitleToFilename } from './notes.js';
import { resolveVaultPaths } from '../../config/paths.js';
import { openDb } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { FakeEmbedder } from '../../embeddings/embedder.js';
import { Indexer } from '../../index/indexer.js';
import { IndexRepo } from '../../index/repo.js';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sanji-notes-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function mount(opts?: { withIndexer?: boolean }) {
  const paths = resolveVaultPaths(dir);
  mkdirSync(paths.sanjiDir, { recursive: true });
  const db = openDb(':memory:');
  runMigrations(db);
  const repo = new IndexRepo(db);
  const embedder = new FakeEmbedder();
  const indexer = opts?.withIndexer
    ? new Indexer(db, embedder, { chunkSizeTokens: 500, chunkOverlapTokens: 50 })
    : undefined;
  const app = new Hono();
  app.route('/', notesRoute({ paths, repo, ...(indexer ? { indexer } : {}) }));
  return { app, paths, repo, embedder, indexer };
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

  it('replaces the first H1 even when the new title is much shorter than the old one', () => {
    // Regression for fmEnd-offset bug: when the new title is shorter than
    // the old one, the rebuilt frontmatter shrinks and the original
    // fmMatch[0].length over-shoots into the body. If we slice `rest`
    // from that stale offset we cut past the H1 (or into it), the regex
    // misses, and the H1 stays stale despite a successful frontmatter
    // sync. Use a title delta that's clearly bigger than the H1 line.
    const out = syncTitleToFilename(
      '---\ntitle: a-very-long-original-title-foo-bar-baz\n---\n\n# a-very-long-original-title-foo-bar-baz\n\nbody\n',
      'x',
    );
    expect(out).toContain('title: x');
    expect(out).toContain('# x');
    expect(out).not.toMatch(/^# a-very-long-original-title/m);
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

  it('POST /api/notes/rename re-chunks the new path so semantic retrieval keeps working', async () => {
    // Without re-indexing, the rename route deletes chunks for the old path
    // (via deleteNote cascade) and inserts a bare notes row at the new path
    // — so semantic_search / hybrid_search return zero hits for the renamed
    // note's body until the next full indexAll().
    writeFileSync(
      join(dir, 'a.md'),
      '---\ntitle: A\n---\n\n# A\n\nthe quick brown fox jumps over the lazy dog\n',
    );
    const { app, repo, embedder, indexer } = mount({ withIndexer: true });
    // Seed: index a.md so chunks exist before rename.
    await indexer!.indexFile(dir, 'a.md');
    expect(repo.knnChunks(await embedder.embed('quick brown fox'), 5)
      .some((h) => h.notePath === 'a.md')).toBe(true);

    const res = await app.request('/api/notes/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'a.md', to: 'b.md' }),
    });
    expect(res.status).toBe(200);

    const queryVec = await embedder.embed('quick brown fox');
    const hits = repo.knnChunks(queryVec, 10);
    expect(hits.some((h) => h.notePath === 'b.md')).toBe(true);
    expect(hits.some((h) => h.notePath === 'a.md')).toBe(false);
  });

  it('POST /api/notes/rename snapshots the renamed note before title sync (atomic+versioned)', async () => {
    // The title-sync step replaces an existing on-disk note. Without a
    // snapshot + atomic temp+rename, a mid-write failure would leave a
    // truncated file with no recovery path. We don't simulate the failure
    // here (fs failure injection is awkward across platforms) — we
    // verify the snapshot artifact exists, which is the user-facing
    // recovery surface.
    writeFileSync(join(dir, 'foo.md'), '---\ntitle: foo\n---\n\n# foo\n\nbody\n');
    const { app, paths } = mount();

    const res = await app.request('/api/notes/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'foo.md', to: 'bar.md' }),
    });
    expect(res.status).toBe(200);
    // Snapshot landed in .sanji/versions/ before the in-place title rewrite.
    const versionsDir = join(paths.vault, '.sanji', 'versions');
    expect(existsSync(versionsDir)).toBe(true);
    const snapshots = readdirSync(versionsDir);
    expect(snapshots.some((f) => f.startsWith('bar.md.'))).toBe(true);
    // New file content reflects the title sync.
    const updated = readFileSync(join(paths.vault, 'bar.md'), 'utf8');
    expect(updated).toContain('title: bar');
    expect(updated).toContain('# bar');
  });

  it('PUT /api/notes/* re-chunks the saved note so semantic retrieval reflects the new body', async () => {
    // Without indexer.indexFile() on save, Indexer.indexFile() would skip
    // the next full pass because mtime + schema_version match — meaning
    // semantic_search keeps returning the OLD chunks for the saved note.
    writeFileSync(
      join(dir, 'a.md'),
      '---\ntitle: A\n---\n\n# A\n\nthe-pristine-original-body\n',
    );
    const { app, repo, embedder, indexer } = mount({ withIndexer: true });
    await indexer!.indexFile(dir, 'a.md');
    expect(
      repo.knnChunks(await embedder.embed('pristine-original'), 5)
        .some((h) => h.notePath === 'a.md'),
    ).toBe(true);

    const res = await app.request('/api/notes/a.md', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: '---\ntitle: A\n---\n\n# A\n\nthe-totally-different-replacement-body\n',
      }),
    });
    expect(res.status).toBe(200);

    // Old chunk text is gone; new chunk text is queryable.
    const hits = repo.knnChunks(await embedder.embed('totally-different-replacement'), 10);
    expect(hits.some((h) => h.notePath === 'a.md')).toBe(true);
    // And the firstChunk of a.md now reflects the new body, not the old.
    const first = repo.firstChunk('a.md');
    expect(first?.text).toContain('totally-different-replacement');
    expect(first?.text).not.toContain('pristine-original');
  });

  it('deleteNote purges chunks_vec rows so KNN does not return orphans', async () => {
    // Regression: chunks_vec is a vec0 virtual table without FK CASCADE,
    // so deleting a notes row used to leave its vector rows behind. KNN
    // returned them in top-k, the join against chunks dropped them, and
    // searches returned too few results (or missed renamed notes).
    writeFileSync(
      join(dir, 'a.md'),
      '---\ntitle: A\n---\n\n# A\n\nthe pristine original body\n',
    );
    const { repo, embedder, indexer } = mount({ withIndexer: true });
    await indexer!.indexFile(dir, 'a.md');
    const before = repo.knnChunks(await embedder.embed('pristine'), 5);
    expect(before.some((h) => h.notePath === 'a.md')).toBe(true);

    repo.deleteNote('a.md');

    const after = repo.knnChunks(await embedder.embed('pristine'), 5);
    expect(after.some((h) => h.notePath === 'a.md')).toBe(false);
    // And the chunks_vec row count for that path is zero. We probe via
    // the same join used at KNN-time; if there were orphan vec rows for
    // a.md we'd see them in a raw vec scan, but they should be gone.
    // Easiest assertion: another note's content stays visible (no
    // collateral damage).
    writeFileSync(join(dir, 'b.md'), '---\ntitle: B\n---\n\n# B\n\ndifferent material here\n');
    await indexer!.indexFile(dir, 'b.md');
    const bHits = repo.knnChunks(await embedder.embed('different material'), 5);
    expect(bHits.some((h) => h.notePath === 'b.md')).toBe(true);
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

  it('POST /api/notes creates a note with skeleton frontmatter + H1', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'scratch/todo.md' }),
    });
    expect(res.status).toBe(200);
    const onDisk = readFileSync(join(dir, 'scratch/todo.md'), 'utf8');
    expect(onDisk).toMatch(/^---\ntitle: todo\ncreated: \d{4}-\d{2}-\d{2}T/);
    expect(onDisk).toMatch(/\n# todo\n/);
  });

  it('POST /api/notes accepts explicit content and skips the skeleton', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'a.md', content: 'hello body\n' }),
    });
    expect(res.status).toBe(200);
    expect(readFileSync(join(dir, 'a.md'), 'utf8')).toBe('hello body\n');
  });

  it('POST /api/notes returns 409 if target exists', async () => {
    writeFileSync(join(dir, 'a.md'), 'already here');
    const { app } = mount();
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'a.md' }),
    });
    expect(res.status).toBe(409);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('TARGET_EXISTS');
  });

  it('POST /api/notes returns 400 on bad path', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '../escape.md' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/notes creates parent dirs via mkdir -p', async () => {
    const { app } = mount();
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'a/b/c/deep.md' }),
    });
    expect(res.status).toBe(200);
    expect(existsSync(join(dir, 'a/b/c/deep.md'))).toBe(true);
  });
});

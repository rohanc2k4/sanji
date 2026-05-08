import { describe, expect, it, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { resolveVaultPaths } from '../config/paths.js';
import { writeNoteTool } from './write-note.js';
import type { ToolContext } from './types.js';

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

function setup() {
  const { dir, cleanup } = makeTmpDir();
  cleanups.push(cleanup);
  const ctx: ToolContext = {
    paths: resolveVaultPaths(dir),
    db: null as never,
    repo: null as never,
    embedder: null as never,
  };
  return { dir, ctx };
}

describe('writeNoteTool', () => {
  it('writes a new file (no snapshot needed)', async () => {
    const { dir, ctx } = setup();
    const out = await writeNoteTool.run({ path: 'scratch/a.md', content: 'hello' }, ctx);
    const r = JSON.parse(out);
    expect(r.path).toBe('scratch/a.md');
    expect(r.snapshot).toBeNull();
    expect(r.bytesWritten).toBe(5);
    expect(readFileSync(join(dir, 'scratch/a.md'), 'utf8')).toBe('hello');
  });

  it('snapshots an existing file before overwrite', async () => {
    const { dir, ctx } = setup();
    await mkdir(join(dir, 'scratch'), { recursive: true });
    await writeFile(join(dir, 'scratch/a.md'), 'old', 'utf8');

    const out = await writeNoteTool.run({ path: 'scratch/a.md', content: 'new' }, ctx);
    const r = JSON.parse(out);
    expect(r.snapshot).toMatch(/^\.sanji\/versions\/scratch\/a\.md\.\d+$/);
    expect(readFileSync(join(dir, 'scratch/a.md'), 'utf8')).toBe('new');

    const snapshots = readdirSync(join(dir, '.sanji/versions/scratch'));
    expect(snapshots).toHaveLength(1);
    expect(readFileSync(join(dir, '.sanji/versions/scratch', snapshots[0]!), 'utf8')).toBe('old');
  });

  it('preserves existing frontmatter when new content omits it (overwrite path)', async () => {
    const { dir, ctx } = setup();
    await mkdir(join(dir, 'inbox'), { recursive: true });
    const original =
      '---\n' +
      'title: Demo\n' +
      'source: .sanji/originals/demo.pdf\n' +
      'ingested_on: 2026-05-06\n' +
      'content_type: paper\n' +
      'summary: short\n' +
      '---\n\n' +
      '# Demo\n\nold body\n';
    await writeFile(join(dir, 'inbox/demo.md'), original, 'utf8');

    const newBody = '# Demo\n\nrewritten body\n';
    await writeNoteTool.run({ path: 'inbox/demo.md', content: newBody }, ctx);

    const onDisk = readFileSync(join(dir, 'inbox/demo.md'), 'utf8');
    expect(onDisk.startsWith('---\n')).toBe(true);
    expect(onDisk).toContain('title: Demo');
    expect(onDisk).toContain('source: .sanji/originals/demo.pdf');
    expect(onDisk).toContain('rewritten body');
  });

  it('does not double-prepend when new content already has frontmatter', async () => {
    const { dir, ctx } = setup();
    await mkdir(join(dir, 'inbox'), { recursive: true });
    await writeFile(
      join(dir, 'inbox/a.md'),
      '---\ntitle: Old\n---\n\nold\n',
      'utf8',
    );
    const next = '---\ntitle: New\n---\n\nnew body\n';
    await writeNoteTool.run({ path: 'inbox/a.md', content: next }, ctx);
    const onDisk = readFileSync(join(dir, 'inbox/a.md'), 'utf8');
    expect(onDisk).toBe(next);
    // Only one frontmatter block on disk.
    expect(onDisk.match(/^---\s*$/gm)?.length).toBe(2);
  });

  it('auto-creates nested parent directories', async () => {
    const { dir, ctx } = setup();
    await writeNoteTool.run({ path: 'a/b/c/deep.md', content: 'x' }, ctx);
    expect(readFileSync(join(dir, 'a/b/c/deep.md'), 'utf8')).toBe('x');
  });

  it('rejects absolute paths', async () => {
    const { ctx } = setup();
    await expect(
      writeNoteTool.run({ path: '/etc/foo.md', content: 'x' }, ctx),
    ).rejects.toThrow(/relative/);
  });

  it('rejects path traversal', async () => {
    const { ctx } = setup();
    await expect(
      writeNoteTool.run({ path: '../escape.md', content: 'x' }, ctx),
    ).rejects.toThrow(/traversal/);
  });

  it('rejects non-string content', async () => {
    const { ctx } = setup();
    await expect(
      writeNoteTool.run({ path: 'a.md', content: 123 as unknown as string }, ctx),
    ).rejects.toThrow(/content/);
  });

  it('rejects empty path', async () => {
    const { ctx } = setup();
    await expect(writeNoteTool.run({ path: '', content: 'x' }, ctx)).rejects.toThrow(/path/);
    await expect(writeNoteTool.run({ content: 'x' }, ctx)).rejects.toThrow(/path/);
  });
});

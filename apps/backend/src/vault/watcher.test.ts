import { describe, expect, it, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { makeTmpDir } from '../../tests/helpers/tmp-db.js';
import { VaultWatcher, type VaultEvent } from './watcher.js';

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const c of cleanups.splice(0)) await c(); });

function untilEvent(w: VaultWatcher, predicate: (e: VaultEvent) => boolean, timeoutMs = 5000) {
  return new Promise<VaultEvent>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for event')), timeoutMs);
    w.on('event', (e: VaultEvent) => {
      if (predicate(e)) {
        clearTimeout(timer);
        resolve(e);
      }
    });
  });
}

describe('VaultWatcher', () => {
  it('emits add/change/unlink for markdown files only', async () => {
    const { dir, cleanup } = makeTmpDir();
    cleanups.push(cleanup);
    await mkdir(join(dir, '.sanji'), { recursive: true });
    await writeFile(join(dir, '.sanji', 'config.toml'), '');
    const w = new VaultWatcher(dir);
    cleanups.push(() => w.close());
    await w.ready();

    await writeFile(join(dir, 'a.md'), '# A');
    const add = await untilEvent(w, (e) => e.kind === 'add' && e.path === 'a.md');
    expect(add.kind).toBe('add');

    await writeFile(join(dir, 'a.md'), '# A2');
    const change = await untilEvent(w, (e) => e.kind === 'change' && e.path === 'a.md');
    expect(change.kind).toBe('change');

    await rm(join(dir, 'a.md'));
    const del = await untilEvent(w, (e) => e.kind === 'unlink' && e.path === 'a.md');
    expect(del.kind).toBe('unlink');
  });

  it('ignores .sanji/, .git/, and non-markdown files', async () => {
    const { dir, cleanup } = makeTmpDir();
    cleanups.push(cleanup);
    await mkdir(join(dir, '.sanji'), { recursive: true });
    await mkdir(join(dir, '.git'), { recursive: true });
    const w = new VaultWatcher(dir);
    cleanups.push(() => w.close());
    await w.ready();

    const events: VaultEvent[] = [];
    w.on('event', (e) => events.push(e));
    await writeFile(join(dir, '.sanji', 'noisy.md'), '# x');
    await writeFile(join(dir, '.git', 'noisy.md'), '# x');
    await writeFile(join(dir, 'note.txt'), 'plain');
    await writeFile(join(dir, 'real.md'), '# real');

    await new Promise((r) => setTimeout(r, 300));
    expect(events.find((e) => e.path === 'real.md')?.kind).toBe('add');
    expect(events.find((e) => e.path.startsWith('.sanji'))).toBeUndefined();
    expect(events.find((e) => e.path === 'note.txt')).toBeUndefined();
  });
});

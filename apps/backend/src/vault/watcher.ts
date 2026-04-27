import chokidar, { type FSWatcher } from 'chokidar';
import { EventEmitter } from 'node:events';
import { relative } from 'node:path';

export type VaultEvent =
  | { kind: 'add'; path: string }
  | { kind: 'change'; path: string }
  | { kind: 'unlink'; path: string };

export class VaultWatcher extends EventEmitter {
  private watcher: FSWatcher;
  private readyPromise: Promise<void>;

  constructor(private vaultRoot: string) {
    super();
    this.watcher = chokidar.watch(vaultRoot, {
      ignored: (p: string) =>
        /(^|[\\/])\.sanji([\\/]|$)/.test(p) || /(^|[\\/])\.git([\\/]|$)/.test(p),
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
      persistent: true,
    });
    this.readyPromise = new Promise((resolve) => this.watcher.once('ready', () => resolve()));

    this.watcher.on('add', (p) => this.maybeEmit('add', p));
    this.watcher.on('change', (p) => this.maybeEmit('change', p));
    this.watcher.on('unlink', (p) => this.maybeEmit('unlink', p));
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  async close(): Promise<void> {
    await this.watcher.close();
  }

  private maybeEmit(kind: VaultEvent['kind'], absPath: string): void {
    if (!absPath.toLowerCase().endsWith('.md')) return;
    const rel = relative(this.vaultRoot, absPath);
    this.emit('event', { kind, path: rel } satisfies VaultEvent);
  }
}

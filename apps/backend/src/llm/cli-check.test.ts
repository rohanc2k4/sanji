import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Readable } from 'node:stream';

// child_process.spawn is mocked so each test can script the success/ENOENT/
// timeout/non-zero-exit/unparseable-output scenarios without touching the
// real shell.
const spawnMock = vi.fn();
vi.mock('node:child_process', () => ({ spawn: spawnMock }));

// Helper to build a fake ChildProcess that the module's promise will race
// against. Pushing into `stdout` / `stderr` and emitting 'close' resolves
// the spawn. Emitting 'error' rejects via the error path. `kill` is a
// no-op spy so the module can call it on timeout.
function fakeChild(opts: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  errorOnStart?: NodeJS.ErrnoException;
}) {
  const emitter = new EventEmitter() as EventEmitter & {
    stdout: Readable;
    stderr: Readable;
    kill: ReturnType<typeof vi.fn>;
  };
  const stdoutEmitter = new EventEmitter() as unknown as Readable;
  const stderrEmitter = new EventEmitter() as unknown as Readable;
  emitter.stdout = stdoutEmitter;
  emitter.stderr = stderrEmitter;
  emitter.kill = vi.fn();
  setImmediate(() => {
    if (opts.errorOnStart) {
      emitter.emit('error', opts.errorOnStart);
      return;
    }
    if (opts.stdout) (stdoutEmitter as unknown as EventEmitter).emit('data', Buffer.from(opts.stdout));
    if (opts.stderr) (stderrEmitter as unknown as EventEmitter).emit('data', Buffer.from(opts.stderr));
    emitter.emit('close', opts.exitCode ?? 0);
  });
  return emitter;
}

beforeEach(() => {
  spawnMock.mockReset();
});

describe('checkClaudeCli', () => {
  it('returns installed:true with version when claude --version succeeds', async () => {
    spawnMock.mockImplementationOnce(() => fakeChild({ stdout: 'claude 1.2.3\n', exitCode: 0 }));
    const { checkClaudeCli } = await import('./cli-check.js');
    const result = await checkClaudeCli();
    expect(result.installed).toBe(true);
    expect(result.version).toBe('1.2.3');
    expect(result.os).toBe(process.platform);
  });

  it('returns installed:false on ENOENT (cli not installed)', async () => {
    const enoent: NodeJS.ErrnoException = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' });
    spawnMock.mockReturnValueOnce(fakeChild({ errorOnStart: enoent }));
    const { checkClaudeCli } = await import('./cli-check.js');
    const result = await checkClaudeCli();
    expect(result.installed).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  it('returns installed:false with reason on non-zero exit with stderr', async () => {
    spawnMock.mockReturnValueOnce(fakeChild({ stderr: 'corrupt binary\n', exitCode: 1 }));
    const { checkClaudeCli } = await import('./cli-check.js');
    const result = await checkClaudeCli();
    expect(result.installed).toBe(false);
    expect(result.reason).toMatch(/corrupt binary/);
  });

  it('returns installed:false on unparseable stdout', async () => {
    spawnMock.mockReturnValueOnce(fakeChild({ stdout: 'helo there\n', exitCode: 0 }));
    const { checkClaudeCli } = await import('./cli-check.js');
    const result = await checkClaudeCli();
    expect(result.installed).toBe(false);
    expect(result.reason).toMatch(/did not return a version/i);
  });
});

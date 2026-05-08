import { describe, it, expect, vi } from 'vitest';
import { shouldClearOnThreshold, secondsSinceLastActivity, runIdleWatcher } from './auto-clear';

describe('shouldClearOnThreshold', () => {
  it('returns true when usage crosses the threshold fraction of contextWindow', () => {
    expect(shouldClearOnThreshold({ inputTokens: 150_000, outputTokens: 5_000 }, 200_000, 0.75)).toBe(true);
  });
  it('returns false below the threshold', () => {
    expect(shouldClearOnThreshold({ inputTokens: 100_000, outputTokens: 0 }, 200_000, 0.75)).toBe(false);
  });
  it('treats threshold = 1.0 as never-fire (full window)', () => {
    expect(shouldClearOnThreshold({ inputTokens: 199_999, outputTokens: 0 }, 200_000, 1.0)).toBe(false);
  });
  it('handles zero usage', () => {
    expect(shouldClearOnThreshold({ inputTokens: 0, outputTokens: 0 }, 200_000, 0.75)).toBe(false);
  });
});

describe('secondsSinceLastActivity', () => {
  it('returns the elapsed seconds rounded down', () => {
    const now = new Date('2026-05-08T12:00:30Z').getTime();
    const last = new Date('2026-05-08T12:00:00Z').getTime();
    expect(secondsSinceLastActivity(now, last)).toBe(30);
  });
  it('returns 0 when no activity yet (last = null)', () => {
    expect(secondsSinceLastActivity(Date.now(), null)).toBe(0);
  });
});

describe('runIdleWatcher', () => {
  it('fires onFire when idleMs elapses with no reset', () => {
    vi.useFakeTimers();
    const onFire = vi.fn();
    const watcher = runIdleWatcher({ idleMs: 30 * 60 * 1000, onFire });
    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    expect(onFire).toHaveBeenCalledOnce();
    watcher.cancel();
    vi.useRealTimers();
  });

  it('does not fire if reset is called before the timeout elapses', () => {
    vi.useFakeTimers();
    const onFire = vi.fn();
    const watcher = runIdleWatcher({ idleMs: 30 * 60 * 1000, onFire });
    vi.advanceTimersByTime(20 * 60 * 1000);
    watcher.reset();
    vi.advanceTimersByTime(20 * 60 * 1000);
    expect(onFire).not.toHaveBeenCalled();
    watcher.cancel();
    vi.useRealTimers();
  });

  it('fires after a reset once a fresh idle period elapses', () => {
    vi.useFakeTimers();
    const onFire = vi.fn();
    const watcher = runIdleWatcher({ idleMs: 30 * 60 * 1000, onFire });
    vi.advanceTimersByTime(20 * 60 * 1000);
    watcher.reset();
    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    expect(onFire).toHaveBeenCalledOnce();
    watcher.cancel();
    vi.useRealTimers();
  });

  it('cancel prevents subsequent fires', () => {
    vi.useFakeTimers();
    const onFire = vi.fn();
    const watcher = runIdleWatcher({ idleMs: 30 * 60 * 1000, onFire });
    watcher.cancel();
    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    expect(onFire).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

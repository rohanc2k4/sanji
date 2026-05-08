export interface UsageLike {
  inputTokens: number;
  outputTokens: number;
}

export function shouldClearOnThreshold(
  usage: UsageLike,
  contextWindow: number,
  threshold: number,
): boolean {
  if (threshold >= 1) return false;
  const used = usage.inputTokens + usage.outputTokens;
  return used >= contextWindow * threshold;
}

export function secondsSinceLastActivity(now: number, last: number | null): number {
  if (last === null) return 0;
  return Math.floor((now - last) / 1000);
}

export interface IdleWatcher {
  reset: () => void;
  cancel: () => void;
}

export function runIdleWatcher(opts: {
  idleMs: number;
  onFire: () => void;
}): IdleWatcher {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  const arm = () => {
    if (cancelled) return;
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!cancelled) opts.onFire();
    }, opts.idleMs);
  };
  arm();
  return {
    reset: arm,
    cancel: () => {
      cancelled = true;
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
    },
  };
}

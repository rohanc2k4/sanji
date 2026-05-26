import { execSync } from 'node:child_process';

let cached: boolean | null = null;

/**
 * Detect whether ripgrep is available on PATH. Cached for the lifetime of
 * the process — we don't expect rg to appear or disappear mid-run.
 */
export function hasRipgrep(): boolean {
  if (cached !== null) return cached;
  try {
    execSync('rg --version', { stdio: 'ignore' });
    cached = true;
  } catch {
    cached = false;
  }
  return cached;
}

/** Test-only hook so suites can force re-detection. */
export function _resetRipgrepCache(): void {
  cached = null;
}

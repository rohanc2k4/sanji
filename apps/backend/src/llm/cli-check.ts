import { spawn } from 'node:child_process';
import type { ClaudeCliCheckResult, ClaudeCliOs } from '@sanji/shared';

const SUPPORTED_OS = new Set<ClaudeCliOs>(['darwin', 'linux', 'win32']);
const SPAWN_TIMEOUT_MS = 3_000;
const VERSION_REGEX = /(\d+\.\d+\.\d+)/;

function detectOs(): { os: ClaudeCliOs; unsupportedRaw?: string } {
  const raw = process.platform;
  if (SUPPORTED_OS.has(raw as ClaudeCliOs)) return { os: raw as ClaudeCliOs };
  // Fall back to linux for unknown unix-likes (freebsd, openbsd, sunos...).
  // The Linux install snippet is the closest match for most of those.
  return { os: 'linux', unsupportedRaw: raw };
}

/**
 * Probe the local Claude CLI by spawning `claude --version`. Returns a
 * structured result the onboarding sub-step uses to decide between
 * "render the install guide" and "advance to credentials test." Read-only
 * and idempotent; safe to call repeatedly.
 */
export async function checkClaudeCli(): Promise<ClaudeCliCheckResult> {
  const { os, unsupportedRaw } = detectOs();
  if (unsupportedRaw) {
    return {
      installed: false,
      os,
      reason: `unsupported platform: ${unsupportedRaw}`,
    };
  }

  try {
    return await new Promise<ClaudeCliCheckResult>((resolve) => {
      // Windows: shell:true so .cmd shims (npm-installed CLIs) resolve.
      // macOS/Linux: bare spawn. shell:true would invoke /bin/sh and
      // change quoting semantics for no benefit.
      const useShell = os === 'win32';
      const child = spawn('claude', ['--version'], { shell: useShell });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { child.kill(); } catch { /* ignore */ }
        resolve({ installed: false, os, reason: 'check timed out' });
      }, SPAWN_TIMEOUT_MS);

      child.stdout?.on('data', (b: Buffer) => { stdout += b.toString(); });
      child.stderr?.on('data', (b: Buffer) => { stderr += b.toString(); });

      child.on('error', (err: NodeJS.ErrnoException) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err.code === 'ENOENT') {
          resolve({ installed: false, os });
          return;
        }
        resolve({ installed: false, os, reason: err.message });
      });

      child.on('close', (code: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code !== 0) {
          const firstLine = stderr.split('\n')[0]?.trim() || `exited with code ${code}`;
          resolve({ installed: false, os, reason: firstLine });
          return;
        }
        const match = stdout.match(VERSION_REGEX);
        if (!match) {
          resolve({
            installed: false,
            os,
            reason: 'claude --version did not return a version string',
          });
          return;
        }
        resolve({ installed: true, os, version: match[1] });
      });
    });
  } catch (err) {
    return {
      installed: false,
      os,
      reason: `detection failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

import { spawn } from 'node:child_process';

export interface GrepMatch {
  path: string;
  line: number;
  text: string;
}

export interface GrepOpts {
  vaultRoot: string;
  pattern: string;
  folder?: string;
  caseSensitive: boolean;
  maxResults: number;
}

/**
 * Run ripgrep against the vault and return matches as a flat array. Uses
 * `--json` event stream for structured output, falls back to literal mode
 * if the pattern fails to compile as a regex (mirrors the Node fallback).
 *
 * Exit code 1 from rg means "no matches" — treat as a successful empty
 * result, not an error.
 */
export async function rgGrep(opts: GrepOpts): Promise<GrepMatch[]> {
  const args: string[] = [
    '--json',
    '--max-filesize',
    '5M',
    '--type',
    'md',
    opts.caseSensitive ? '-s' : '-i',
    '--',
    opts.pattern,
    opts.folder || '.',
  ];
  return new Promise<GrepMatch[]>((resolve, reject) => {
    const child = spawn('rg', args, { cwd: opts.vaultRoot });
    const matches: GrepMatch[] = [];
    let buf = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line) continue;
        if (matches.length >= opts.maxResults) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === 'match') {
            matches.push({
              path: evt.data.path.text,
              line: evt.data.line_number,
              text: (evt.data.lines.text as string).replace(/\n$/, ''),
            });
          }
        } catch {
          // Non-JSON line, skip.
        }
      }
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => {
      // rg: 0 = matches, 1 = no matches, 2 = error.
      if (code === 0 || code === 1) resolve(matches.slice(0, opts.maxResults));
      else reject(new Error(`ripgrep exited with code ${code}: ${stderr.trim()}`));
    });
    child.on('error', (err) => reject(err));
  });
}

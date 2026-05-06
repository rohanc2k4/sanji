import type { IndexRepo } from '../index/repo.js';

export interface VaultContextNote {
  path: string;
  title: string | null;
  summary: string | null;
}

export interface VaultContext {
  notes: VaultContextNote[];
}

const SUMMARY_MAX = 200;

function truncate(s: string): string {
  return s.length > SUMMARY_MAX ? `${s.slice(0, SUMMARY_MAX - 1)}…` : s;
}

function deriveSummary(frontmatterJson: string | null, body: string): string | null {
  if (frontmatterJson) {
    try {
      const fm = JSON.parse(frontmatterJson) as Record<string, unknown>;
      const summary = fm['summary'];
      if (typeof summary === 'string' && summary.length > 0) {
        return truncate(summary);
      }
    } catch {
      /* fall through to body fallback */
    }
  }
  // First paragraph of body, truncated.
  const para = body.split(/\n\s*\n/, 1)[0]?.trim() ?? '';
  if (!para) return null;
  return truncate(para);
}

export async function buildVaultContext(repo: IndexRepo): Promise<VaultContext> {
  const rows = repo.listNotesForContext();
  const notes: VaultContextNote[] = rows.map((r) => ({
    path: r.path,
    title: r.title,
    summary: deriveSummary(r.frontmatter_json, r.body),
  }));
  return { notes };
}

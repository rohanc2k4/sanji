import matter from 'gray-matter';
import type { Note, Wikilink } from '@sanji/shared';

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
const H1_RE = /^#\s+(.+?)\s*$/m;

export interface ParsedNote {
  note: Note;
  wikilinks: Wikilink[];
}

/**
 * Attempt to repair common YAML hazards in frontmatter scalar values so a note
 * with sloppy frontmatter (unquoted titles containing `:`, leading reserved
 * characters, etc.) parses instead of throwing.
 *
 * Operates only on the leading `---\n…\n---` block; body is untouched. For each
 * top-level `key: value` line where the value isn't already quoted, isn't a
 * list/block scalar, and contains a known hazard, the value is JSON.stringified
 * (which yields valid YAML double-quoted form). Lines we don't recognize are
 * left as-is.
 */
function sanitizeFrontmatter(source: string): string {
  const m = source.match(/^---\n([\s\S]*?)\n---(\r?\n[\s\S]*)?$/);
  if (!m) return source;
  const fmBlock = m[1] ?? '';
  const rest = m[2] ?? '';
  const fixedLines = fmBlock.split('\n').map((line) => {
    const kv = line.match(/^([A-Za-z_][\w-]*): +(.+?)\s*$/);
    if (!kv) return line;
    const key = kv[1]!;
    const value = kv[2] ?? '';
    const trimmed = value.trim();
    if (!trimmed) return line;
    const firstChar = trimmed[0];
    if (firstChar === '"' || firstChar === "'" || firstChar === '[' || firstChar === '{' || firstChar === '|' || firstChar === '>') return line;
    const hazardous =
      /:\s/.test(trimmed) ||
      /^[-?!&*@`%]/.test(trimmed) ||
      /[#]/.test(trimmed);
    if (!hazardous) return line;
    return `${key}: ${JSON.stringify(trimmed)}`;
  });
  return `---\n${fixedLines.join('\n')}\n---${rest}`;
}

export function parseNote(path: string, source: string, mtimeMs: number): ParsedNote {
  let frontmatter: Record<string, unknown> | null = null;
  let body = source;
  if (source.startsWith('---')) {
    let parsed: ReturnType<typeof matter> | null = null;
    try {
      parsed = matter(source);
    } catch {
      try {
        parsed = matter(sanitizeFrontmatter(source));
      } catch {
        parsed = null;
      }
    }
    if (parsed) {
      frontmatter = (parsed.data as Record<string, unknown>) ?? null;
      if (frontmatter && Object.keys(frontmatter).length === 0) frontmatter = null;
      body = parsed.content;
    }
    // If both attempts failed, fall through with frontmatter=null and body=source.
    // Better to index the body than to crash the indexer on one bad note.
  }

  const rawTitle = frontmatter ? frontmatter.title : null;
  const fmTitle =
    rawTitle != null && (typeof rawTitle === 'string' || rawTitle instanceof Date)
      ? rawTitle instanceof Date
        ? rawTitle.toISOString().slice(0, 10)
        : (rawTitle as string)
      : null;
  const h1 = body.match(H1_RE)?.[1] ?? null;
  const title = fmTitle ?? h1 ?? null;

  const counts = new Map<string, number>();
  for (const m of body.matchAll(WIKILINK_RE)) {
    const slug = (m[1] ?? '').trim();
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  const wikilinks: Wikilink[] = Array.from(counts.entries()).map(([targetSlug, n]) => ({
    sourcePath: path,
    targetSlug,
    occurrenceCount: n,
  }));

  return {
    note: { path, mtimeMs, body, frontmatter, title },
    wikilinks,
  };
}

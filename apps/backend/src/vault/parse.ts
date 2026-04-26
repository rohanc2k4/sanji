import matter from 'gray-matter';
import type { Note, Wikilink } from '@sanji/shared';

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
const H1_RE = /^#\s+(.+?)\s*$/m;

export interface ParsedNote {
  note: Note;
  wikilinks: Wikilink[];
}

export function parseNote(path: string, source: string, mtimeMs: number): ParsedNote {
  let frontmatter: Record<string, unknown> | null = null;
  let body = source;
  if (source.startsWith('---')) {
    const parsed = matter(source);
    frontmatter = (parsed.data as Record<string, unknown>) ?? null;
    if (frontmatter && Object.keys(frontmatter).length === 0) frontmatter = null;
    body = parsed.content;
  }

  const fmTitle =
    frontmatter && typeof frontmatter.title === 'string' ? (frontmatter.title as string) : null;
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

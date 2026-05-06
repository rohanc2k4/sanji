import { parse as parseYaml } from 'yaml';
import type { NoteFrontmatter } from '@sanji/shared';

export const REQUIRED_FIELDS = [
  'title',
  'source',
  'ingested_on',
  'content_type',
  'summary',
] as const;

export interface ParsedRewrite {
  frontmatter: NoteFrontmatter;
  body: string;
}

export function parseRewriteOutput(raw: string): ParsedRewrite {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) {
    throw new Error('rewrite output missing YAML frontmatter delimiters');
  }
  const yamlBlock = m[1]!;
  const body = m[2] ?? '';

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlBlock);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`rewrite frontmatter is not valid YAML: ${msg}`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('rewrite frontmatter did not parse to an object');
  }
  const fm = parsed as Record<string, unknown>;

  for (const required of REQUIRED_FIELDS) {
    const v = fm[required];
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error(`rewrite frontmatter missing required field: ${required}`);
    }
  }

  const frontmatter: NoteFrontmatter = {
    title: fm.title as string,
    source: fm.source as string,
    ingested_on: fm.ingested_on as string,
    content_type: fm.content_type as NoteFrontmatter['content_type'],
    summary: fm.summary as string,
  };
  if (Array.isArray(fm.tags)) frontmatter.tags = fm.tags as string[];
  if (typeof fm.original_format === 'string') {
    frontmatter.original_format = fm.original_format as NoteFrontmatter['original_format'];
  }
  if (typeof fm.pages === 'number') frontmatter.pages = fm.pages;

  return { frontmatter, body };
}

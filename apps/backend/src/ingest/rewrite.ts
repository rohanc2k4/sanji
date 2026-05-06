import { parse as parseYaml } from 'yaml';
import type { FileFormat, NoteFrontmatter, ProviderAdapter } from '@sanji/shared';
import type { Skill } from '../skills/parse.js';
import { runSkillWithUsage } from '../skills/runSkill.js';
import type { ExtractResult } from './extractors/types.js';
import type { VaultContext } from './context.js';

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

export interface RewriteInput {
  extracted: ExtractResult;
  filename: string;
  format: FileFormat;
  context: VaultContext;
  abortSignal?: AbortSignal;
}

export interface RewriteDeps {
  adapter: ProviderAdapter;
  model: string;
  ingestSkill: Skill;
}

export interface RewriteResult {
  frontmatter: NoteFrontmatter;
  body: string;
  raw: string;
  tokensUsed?: { input: number; output: number };
}

function buildPrompt(input: RewriteInput): string {
  const ctxLines = input.context.notes
    .filter((n) => n.title)
    .map((n) => `- ${n.path} | title: ${n.title} | summary: ${n.summary ?? '(none)'}`)
    .join('\n');

  return [
    `Filename: ${input.filename}`,
    `Format: ${input.format}`,
    `Pages: ${input.extracted.pages ?? 'n/a'}`,
    '',
    'Existing vault context (titles + summaries):',
    ctxLines || '(empty vault)',
    '',
    'Extracted text:',
    '<<<',
    input.extracted.text,
    '>>>',
  ].join('\n');
}

const STRICT_RETRY_REMINDER = `Your previous response was not parseable. Output exactly:
---
title: <string>
source: <string>
ingested_on: <YYYY-MM-DD>
content_type: paper | slides | transcript | article | assignment | code | other
summary: <single line, max 200 chars>
tags: [optional]
---

<body markdown>

Do not include any text before the opening --- or after the body.`;

/**
 * Run the bundled ingest skill against the extracted text + vault context.
 * Parses the LLM output as YAML frontmatter + markdown body. Retries once on
 * parse failure with a stricter schema reminder. On second-attempt failure,
 * throws an error preserving the raw output.
 */
export async function rewrite(
  input: RewriteInput,
  deps: RewriteDeps,
): Promise<RewriteResult> {
  const userPrompt = buildPrompt(input);

  const first = await runSkillWithUsage({
    skill: deps.ingestSkill,
    input: userPrompt,
    adapter: deps.adapter,
    model: deps.model,
    abortSignal: input.abortSignal,
  });

  try {
    const parsed = parseRewriteOutput(first.text);
    return {
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      raw: first.text,
      tokensUsed: first.usage,
    };
  } catch {
    const retryInput = `${userPrompt}\n\n${STRICT_RETRY_REMINDER}`;
    const second = await runSkillWithUsage({
      skill: deps.ingestSkill,
      input: retryInput,
      adapter: deps.adapter,
      model: deps.model,
      abortSignal: input.abortSignal,
    });
    try {
      const parsed = parseRewriteOutput(second.text);
      return {
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        raw: second.text,
        tokensUsed: second.usage,
      };
    } catch (secondErr) {
      const err = new Error(
        `rewrite failed after retry: ${(secondErr as Error).message}`,
      ) as Error & { rawOutput?: string };
      err.rawOutput = second.text;
      throw err;
    }
  }
}

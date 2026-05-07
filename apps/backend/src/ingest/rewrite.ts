import { parse as parseYaml } from 'yaml';
import type { FileFormat, NoteFrontmatter, ProviderAdapter } from '@sanji/shared';
import type { Skill } from '../skills/parse.js';
import { runSkillWithUsage } from '../skills/runSkill.js';
import type { ExtractResult } from './extractors/types.js';
import type { VaultContext } from './context.js';

const REVIEW_SYSTEM = `# Sanji ingest review

You are reviewing a rewritten markdown note against its source for quality. The user message contains the original extracted source text and a draft note (frontmatter + body) produced by an earlier rewrite pass. Your job is to verify the draft is faithful and well-structured, returning either the draft unchanged or a corrected version.

Check the draft against the source on these axes:

1. Frontmatter
   - title: descriptive, reflects the source's actual subject (not the filename).
   - content_type: best fit from {paper, slides, transcript, article, assignment, code, other}. If the draft picked the wrong category, fix it.
   - summary: faithful (claims trace back to the source), single line, 20-200 chars. Tighten if too long; expand if too sparse.
   - tags (optional): source-derived, not generic. Drop generic ones; add specific ones if obvious.

2. Body
   - All major themes from the source are covered, in roughly the order the source presents them.
   - No hallucinated content: every claim should be supported by the source text.
   - Wikilinks: only keep \`[[target]]\` references the draft already wrote; do NOT invent new ones.
   - Section headings are descriptive and follow the source's structure.

3. Output
   - If the draft is good, return it byte-for-byte unchanged.
   - If issues, return a corrected version of the entire note.
   - Do NOT include any explanation, commentary, prose framing, or markdown fences. Output only the note itself, beginning with the opening \`---\` of the frontmatter.

Output format is identical to the rewrite skill: \`---\` opening, frontmatter YAML, \`---\` closing, blank line, body markdown.`;

const REVIEW_SKILL: Skill = {
  source: '<inline>',
  name: 'ingest-review',
  description: 'Sonnet review pass over Haiku rewrite output for ingestion.',
  trigger: '',
  body: REVIEW_SYSTEM,
};

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

export interface ReviewInput {
  extracted: ExtractResult;
  draft: RewriteResult;
  abortSignal?: AbortSignal;
}

export interface ReviewDeps {
  adapter: ProviderAdapter;
  model: string;
}

/**
 * Sonnet (or whatever the configured review model is) crosschecks the Haiku
 * rewrite for faithfulness, content_type accuracy, summary quality, and
 * absence of hallucinations. Returns a possibly-corrected RewriteResult, OR
 * `null` if the review pass failed to produce parseable output. The caller
 * (IngestService) falls back to the original draft on null so review failures
 * never break ingestion — review is a quality gate, not a correctness gate.
 *
 * Uses the same parse + retry-once-on-fail pattern as `rewrite()`.
 */
export async function review(
  input: ReviewInput,
  deps: ReviewDeps,
): Promise<RewriteResult | null> {
  const userPrompt = [
    'SOURCE TEXT (original extraction):',
    '<<<',
    input.extracted.text,
    '>>>',
    '',
    'DRAFT NOTE (under review):',
    '<<<',
    input.draft.raw,
    '>>>',
    '',
    'Return either the unchanged draft or a corrected version. No commentary.',
  ].join('\n');

  let first: { text: string; usage?: { input: number; output: number } };
  try {
    first = await runSkillWithUsage({
      skill: REVIEW_SKILL,
      input: userPrompt,
      adapter: deps.adapter,
      model: deps.model,
      abortSignal: input.abortSignal,
    });
  } catch {
    return null;
  }

  try {
    const parsed = parseRewriteOutput(first.text);
    return {
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      raw: first.text,
      tokensUsed: first.usage,
    };
  } catch {
    let second: { text: string; usage?: { input: number; output: number } };
    try {
      second = await runSkillWithUsage({
        skill: REVIEW_SKILL,
        input: `${userPrompt}\n\n${STRICT_RETRY_REMINDER}`,
        adapter: deps.adapter,
        model: deps.model,
        abortSignal: input.abortSignal,
      });
    } catch {
      return null;
    }
    try {
      const parsed = parseRewriteOutput(second.text);
      return {
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        raw: second.text,
        tokensUsed: second.usage,
      };
    } catch {
      return null;
    }
  }
}

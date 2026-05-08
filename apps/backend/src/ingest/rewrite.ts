import { parse as parseYaml } from 'yaml';
import type { ContentType, FileFormat, NoteFrontmatter, ProviderAdapter } from '@sanji/shared';
import type { Skill } from '../skills/parse.js';
import { runSkillWithUsage } from '../skills/runSkill.js';
import type { ExtractResult } from './extractors/types.js';
import type { VaultContext } from './context.js';

// Only `title` and `summary` are required from the model. The backend fills
// `source` and `ingested_on` post-hoc, and `content_type` is now optional —
// the thin-prompt ingest skill lets the model decide whether bucketing makes
// sense for the source. Listed here as a const so the parser + tests stay
// in sync.
export const REQUIRED_FIELDS = ['title', 'summary'] as const;

export interface ParsedFrontmatter {
  title: string;
  summary: string;
  content_type?: ContentType;
  tags?: string[];
}

export interface ParsedRewrite {
  frontmatter: ParsedFrontmatter;
  body: string;
}

export function parseRewriteOutput(raw: string): ParsedRewrite {
  // Models sometimes wrap the note in a code fence or prefix it with prose
  // like "Here is the structured note:". Tolerate both before insisting on
  // the delimiter.
  const stripped = stripWrappers(raw);
  const m = stripped.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
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

  const frontmatter: ParsedFrontmatter = {
    title: fm.title as string,
    summary: fm.summary as string,
  };
  if (typeof fm.content_type === 'string') {
    frontmatter.content_type = fm.content_type as ContentType;
  }
  if (Array.isArray(fm.tags)) frontmatter.tags = fm.tags as string[];

  return { frontmatter, body };
}

/**
 * Strip two kinds of LLM output noise that wrap an otherwise-valid note:
 *   1. A whole-document code fence wrapper (```markdown ... ``` or ``` ... ```).
 *   2. Leading prose before the first `---` delimiter line ("Here is the
 *      structured note:\n\n---\n...").
 *
 * Returns the raw string trimmed to start at the first `---` delimiter line
 * (if any) so the strict regex parser succeeds. If no delimiter line is
 * found, returns the original string and the parser throws with the
 * meaningful "missing YAML frontmatter delimiters" error.
 */
function stripWrappers(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fence) s = fence[1]!.trim();
  const lines = s.split('\n');
  const firstDelim = lines.findIndex((line) => /^---\s*$/.test(line));
  if (firstDelim > 0) s = lines.slice(firstDelim).join('\n');
  return s;
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
  frontmatter: ParsedFrontmatter;
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

const STRICT_RETRY_REMINDER = `Your previous response could not be parsed. Reply with the note ONLY. The first three characters of your reply MUST be \`---\\n\`. Do NOT wrap in code fences. Do NOT prefix with "Here is" or any other prose. Concrete shape:

---
title: <descriptive string>
summary: <single line, max 200 chars>
---

<one-paragraph summary>

## <Section>

<body content>

End with the body. No commentary after.`;

/**
 * Run the bundled ingest skill against the extracted text + vault context.
 * Parses the LLM output as YAML frontmatter + markdown body. Retries once on
 * parse failure with a stricter format reminder. On second-attempt failure,
 * throws an error that preserves the raw output via a `rawOutput` property
 * so the caller can log it for debugging.
 */
export async function rewrite(
  input: RewriteInput,
  deps: RewriteDeps,
): Promise<RewriteResult> {
  const userPrompt = buildPrompt(input);

  // Ingest rewrites can produce 5-8k tokens of structured markdown for a
  // long PDF; the adapter default of 1024 truncates mid-body and the
  // parser may still accept the (now-incomplete) output because the
  // leading frontmatter is intact. 8000 leaves headroom for any
  // single-document rewrite without bumping into per-request cost.
  const INGEST_MAX_TOKENS = 8000;

  const first = await runSkillWithUsage({
    skill: deps.ingestSkill,
    input: userPrompt,
    adapter: deps.adapter,
    model: deps.model,
    maxTokens: INGEST_MAX_TOKENS,
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
      maxTokens: INGEST_MAX_TOKENS,
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

// Re-export `NoteFrontmatter` so existing imports (e.g. ingest service
// composing the final composed file) keep working without churn. The
// composed final frontmatter overlays the model's parsed fields with
// backend-set fields (`source`, `ingested_on`, `original_format`, `pages`)
// to produce a full `NoteFrontmatter`.
export type { NoteFrontmatter };

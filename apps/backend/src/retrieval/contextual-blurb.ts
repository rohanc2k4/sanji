/**
 * Anthropic contextual retrieval (R1).
 *
 * For each chunk we ask a fast model (Haiku 4.5) to write a 50-100 token
 * blurb situating the chunk in its parent doc. The blurb is prepended to the
 * chunk before embedding + FTS indexing, which materially improves retrieval
 * quality per Anthropic's published benchmarks.
 *
 * The parent doc body is passed as a cached segment so that re-ingesting the
 * same doc (multiple chunks) reuses the parent across calls.
 */

export interface BlurbInput {
  docTitle: string;
  docBody: string;
  chunkText: string;
  headerTrail: string[];
}

export interface BlurbLlmCall {
  system: string;
  docBody: string;
  chunk: string;
  cacheParent: boolean;
}

export interface BlurbDeps {
  llm: (call: BlurbLlmCall) => Promise<string>;
}

const SYSTEM = `You write concise context blurbs for chunks of a document, used to improve retrieval. Given the parent document and a chunk from it, write a 50 to 100 token blurb describing how the chunk fits into the document. Mention the section, the topic, and any entities the chunk discusses. No filler. Output the blurb only, no preamble.`;

const MAX_BLURB_WORDS = 120;

export async function generateContextBlurb(
  input: BlurbInput,
  deps: BlurbDeps,
): Promise<string> {
  const blurb = await deps.llm({
    system: SYSTEM,
    docBody: `Document title: ${input.docTitle}\nSection: ${
      input.headerTrail.join(' > ') || '(top)'
    }\n\n---\n\n${input.docBody}`,
    chunk: input.chunkText,
    cacheParent: true,
  });
  const trimmed = blurb.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > MAX_BLURB_WORDS) return words.slice(0, MAX_BLURB_WORDS).join(' ');
  return trimmed;
}

/**
 * No-op blurb function used when no LLM adapter is wired in (e.g. the eval
 * harness, the kind:'no-vault' bootstrap path, or test code). Indexing still
 * works; chunks just persist with `context_text = null`.
 */
export const noopBlurbLlm: BlurbDeps['llm'] = async () => '';

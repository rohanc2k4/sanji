/**
 * Multi-query rewriter for hybrid retrieval. Fans the user query out into up
 * to 3 paraphrases via Haiku 4.5, which the hybrid_search tool then runs in
 * parallel with the original query and RRF-fuses across all 4 result lists.
 *
 * The agent never sees the rewriter — it just calls hybrid_search(query) and
 * gets better results. On any failure (LLM error, empty output) we return []
 * so hybrid_search degrades gracefully to single-query behavior.
 */
export interface RewriteDeps {
  llm: (prompt: { system: string; user: string }) => Promise<string>;
}

const SYSTEM = `Generate 3 alternative phrasings of the given query that a study assistant might use to search a personal knowledge base. Vary vocabulary and specificity. Output only the 3 phrasings, one per line, no numbering, no commentary.`;

export async function rewriteQuery(query: string, deps: RewriteDeps): Promise<string[]> {
  try {
    const raw = await deps.llm({ system: SYSTEM, user: query });
    return raw
      .split('\n')
      .map((s) => s.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

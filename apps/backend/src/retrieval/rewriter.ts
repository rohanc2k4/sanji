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

const SYSTEM = `Generate 3 alternative phrasings of the given query for searching a personal markdown knowledge base. Cover different surface vocabulary so retrieval bridges lexical mismatches: include filename-style tokens (lowercase, underscores or hyphens), common abbreviations and their expansions (SGD ↔ stochastic gradient descent, RAG ↔ retrieval-augmented generation, RREF ↔ row reduced echelon form), and adjacent technical terms a student would actually type. Each phrasing should be a search query, not a sentence. Output exactly 3 lines, one phrasing per line, no numbering or commentary.`;

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

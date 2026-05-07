export interface RrfResult {
  id: string;
  score: number;
}

/**
 * Reciprocal Rank Fusion. For each input list, every element at rank `i`
 * (1-indexed) contributes `1 / (k + i)` to its id's score. Final scores are
 * summed across lists and the result is sorted descending. Ids unique to a
 * single list still receive their contribution; ids appearing in multiple
 * lists accumulate.
 */
export function rrfFuse(lists: string[][], opts: { k: number }): RrfResult[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => {
      const rank = i + 1;
      const contribution = 1 / (opts.k + rank);
      scores.set(id, (scores.get(id) ?? 0) + contribution);
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

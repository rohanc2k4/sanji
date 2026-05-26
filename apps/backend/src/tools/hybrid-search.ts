import type { Tool, ToolContext } from './types.js';
import type { IndexRepo } from '../index/repo.js';
import { rrfFuse } from '../retrieval/rrf.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;
const RRF_K = 60;
const CANDIDATE_K = 50;

type DenseHit = ReturnType<IndexRepo['knnChunks']>[number];

interface FusedHit {
  path: string;
  chunkIndex: number;
  text: string;
  headerTrail: string[];
  contextText: string | null;
  fusedScore: number;
}

/**
 * Defensive FTS5 query sanitizer: split on whitespace, drop punctuation, quote
 * each token, OR-join. The production search_vault tool currently passes raw
 * query to MATCH and would crash on natural-language input; hybrid does the
 * right thing here.
 */
function sanitizeForFts(query: string): string {
  return query
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(' OR ');
}

interface PerQueryRanked {
  ftsIds: string[];
  denseRanked: DenseHit[];
}

async function runOneQuery(query: string, ctx: ToolContext): Promise<PerQueryRanked> {
  const ftsMatch = sanitizeForFts(query);
  const ftsRowsP: Promise<Array<{ path: string }>> = ftsMatch
    ? Promise.resolve(
        ctx.db
          .prepare('SELECT path FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?')
          .all(ftsMatch, CANDIDATE_K) as Array<{ path: string }>,
      )
    : Promise.resolve([]);
  const denseHitsP = ctx.embedder.embed(query).then((vec) => ctx.repo.knnChunks(vec, CANDIDATE_K));
  const [ftsRows, denseHits] = await Promise.all([ftsRowsP, denseHitsP]);

  // Dedupe dense hits to one-per-path (best chunk by lowest distance, then
  // smallest chunkIndex on ties), preserving knnChunks rank order so RRF sees
  // a meaningful position for each path.
  const bestDensePerPath = new Map<string, DenseHit>();
  for (const h of denseHits) {
    const existing = bestDensePerPath.get(h.notePath);
    if (
      !existing ||
      h.distance < existing.distance ||
      (h.distance === existing.distance && h.chunkIndex < existing.chunkIndex)
    ) {
      bestDensePerPath.set(h.notePath, h);
    }
  }
  const denseRanked: DenseHit[] = [];
  const seen = new Set<string>();
  for (const h of denseHits) {
    if (!seen.has(h.notePath)) {
      seen.add(h.notePath);
      denseRanked.push(bestDensePerPath.get(h.notePath)!);
    }
  }

  return { ftsIds: ftsRows.map((r) => r.path), denseRanked };
}

export const hybridSearchTool: Tool = {
  name: 'hybrid_search',
  description:
    'Hybrid retrieval over the vault: BM25 (FTS5) and dense (sqlite-vec) fused via Reciprocal Rank Fusion. Use this for any vault question. Returns up to N fused chunk hits as JSON, each {path, chunkIndex, text, headerTrail, fusedScore}.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural-language query.' },
      limit: { type: 'number', description: 'Max hits. Defaults to 5, capped at 25.' },
    },
    required: ['query'],
  },
  async run(input, ctx) {
    const raw = input.query;
    if (typeof raw !== 'string') throw new Error("'query' must be a string");
    const query = raw.trim();
    if (!query) throw new Error("'query' must not be empty");
    const limitInput = input.limit;
    const limitNum =
      limitInput === undefined || limitInput === null || !Number.isFinite(Number(limitInput))
        ? DEFAULT_LIMIT
        : Number(limitInput);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitNum)));

    // Fan out: original + up to 3 paraphrases (when a rewriter is wired in).
    // The agent never sees this — it just calls hybrid_search(query) and the
    // bootstrap layer decides whether to attach a rewriter. Empty rewrites
    // (offline fake adapter, rate-limited, etc.) degrade to single-query.
    const rewrites = ctx.rewriter ? await ctx.rewriter(query) : [];
    const queries = [query, ...rewrites];

    const perQuery = await Promise.all(queries.map((q) => runOneQuery(q, ctx)));

    // RRF over all 2N lists (FTS + dense per query). Best dense hit per path
    // is tracked globally for the output mapping.
    const allLists: string[][] = [];
    const denseByPathGlobal = new Map<string, DenseHit>();
    for (const { ftsIds, denseRanked } of perQuery) {
      allLists.push(ftsIds);
      allLists.push(denseRanked.map((h) => h.notePath));
      for (const h of denseRanked) {
        const existing = denseByPathGlobal.get(h.notePath);
        if (!existing || h.distance < existing.distance) {
          denseByPathGlobal.set(h.notePath, h);
        }
      }
    }

    const fused = rrfFuse(allLists, { k: RRF_K }).slice(0, limit);

    const out: FusedHit[] = fused.map(({ id: path, score }) => {
      const dh = denseByPathGlobal.get(path);
      if (dh) {
        return {
          path,
          chunkIndex: dh.chunkIndex,
          text: dh.text,
          headerTrail: dh.headerTrail ?? [],
          contextText: dh.contextText ?? null,
          fusedScore: score,
        };
      }
      const fc = ctx.repo.firstChunk(path);
      return {
        path,
        chunkIndex: fc?.chunkIndex ?? 0,
        text: fc?.text ?? '',
        headerTrail: fc?.headerTrail ?? [],
        contextText: fc?.contextText ?? null,
        fusedScore: score,
      };
    });
    return JSON.stringify(out);
  },
};

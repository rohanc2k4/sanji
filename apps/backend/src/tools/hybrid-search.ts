import type { Tool } from './types.js';
import { rrfFuse } from '../retrieval/rrf.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;
const RRF_K = 60;
const CANDIDATE_K = 50;

interface FusedHit {
  path: string;
  chunkIndex: number;
  text: string;
  headerTrail: string[];
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

    const ftsMatch = sanitizeForFts(query);
    const ftsRows = ftsMatch
      ? (ctx.db
          .prepare('SELECT path FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?')
          .all(ftsMatch, CANDIDATE_K) as Array<{ path: string }>)
      : [];

    const vec = await ctx.embedder.embed(query);
    const denseHits = ctx.repo.knnChunks(vec, CANDIDATE_K);

    const ftsIds = ftsRows.map((r) => `${r.path}:fts`);
    const denseIds = denseHits.map((h) => `${h.notePath}:${h.chunkIndex}`);
    const fused = rrfFuse([ftsIds, denseIds], { k: RRF_K }).slice(0, limit);

    const denseById = new Map(denseHits.map((h) => [`${h.notePath}:${h.chunkIndex}`, h]));

    const out: FusedHit[] = fused.map(({ id, score }) => {
      if (id.endsWith(':fts')) {
        const path = id.slice(0, -':fts'.length);
        const fc = ctx.repo.firstChunk(path);
        return {
          path,
          chunkIndex: fc?.chunkIndex ?? 0,
          text: fc?.text ?? '',
          headerTrail: fc?.headerTrail ?? [],
          fusedScore: score,
        };
      }
      const h = denseById.get(id)!;
      return {
        path: h.notePath,
        chunkIndex: h.chunkIndex,
        text: h.text,
        headerTrail: h.headerTrail ?? [],
        fusedScore: score,
      };
    });
    return JSON.stringify(out);
  },
};

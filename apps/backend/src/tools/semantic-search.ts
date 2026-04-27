import type { Tool } from './types.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;

function validateQuery(input: unknown): string {
  if (typeof input !== 'string') throw new Error("'query' must be a string");
  if (!input.trim()) throw new Error("'query' must not be empty");
  return input;
}

function clampLimit(input: unknown): number {
  if (input === undefined) return DEFAULT_LIMIT;
  if (typeof input !== 'number' || !Number.isFinite(input) || input < 1) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(input));
}

export const semanticSearchTool: Tool = {
  name: 'semantic_search',
  description:
    "Semantic search over chunk embeddings (cosine similarity via sqlite-vec). Use this for conceptual questions ('what did I decide about X', 'what do I know about Y'). For exact-keyword search use search_vault. Returns up to N nearest chunks as JSON, each {notePath, chunkIndex, text, distance}.",
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural-language query that gets embedded and KNN-searched against chunk vectors.',
      },
      limit: {
        type: 'number',
        description: 'Max number of chunks to return. Defaults to 5, capped at 25.',
      },
    },
    required: ['query'],
  },
  async run(input, ctx) {
    const query = validateQuery(input.query);
    const limit = clampLimit(input.limit);
    const vec = await ctx.embedder.embed(query);
    const hits = ctx.repo.knnChunks(vec, limit);
    return JSON.stringify(
      hits.map((h) => ({
        notePath: h.notePath,
        chunkIndex: h.chunkIndex,
        text: h.text,
        distance: h.distance,
      })),
    );
  },
};

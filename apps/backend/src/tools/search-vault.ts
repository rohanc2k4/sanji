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

interface FtsRow {
  path: string;
  title: string | null;
  snippet: string;
}

export const searchVaultTool: Tool = {
  name: 'search_vault',
  description:
    "(deprecated, prefer hybrid_search) FTS5 keyword search over note titles + bodies. Use this when the user names exact keywords ('argocd', 'hubspot', etc). For conceptual questions use semantic_search instead. Returns up to N hits as JSON, each {path, title, snippet}.",
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'FTS5 query string. Plain words match any token; quoted phrases match exact sequences; AND/OR/NOT supported.',
      },
      limit: {
        type: 'number',
        description: 'Max number of hits to return. Defaults to 5, capped at 25.',
      },
    },
    required: ['query'],
  },
  async run(input, ctx) {
    const query = validateQuery(input.query);
    const limit = clampLimit(input.limit);
    const rows = ctx.db
      .prepare(
        "SELECT path, title, snippet(notes_fts, 2, '[', ']', '…', 12) AS snippet " +
          'FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?',
      )
      .all(query, limit) as FtsRow[];
    return JSON.stringify(rows);
  },
};

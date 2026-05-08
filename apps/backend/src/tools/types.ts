import type { ChatTool } from '@sanji/shared';
import type { Db } from '../db/client.js';
import type { Embedder } from '../embeddings/embedder.js';
import type { IndexRepo } from '../index/repo.js';
import type { VaultPaths } from '../config/paths.js';

export interface ToolContext {
  paths: VaultPaths;
  db: Db;
  repo: IndexRepo;
  embedder: Embedder;
  /**
   * Optional multi-query rewriter. When present, hybrid_search fans the
   * incoming query out into the original + up to 3 paraphrases and RRF-fuses
   * across all of them. Absence (or returning []) degrades to single-query
   * behavior. Wired in by the bootstrap layers that have a ProviderAdapter
   * available (server.ts, cli.ts); test contexts and the eval harness can
   * leave it undefined.
   */
  rewriter?: (query: string) => Promise<string[]>;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: ChatTool['input_schema'];
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

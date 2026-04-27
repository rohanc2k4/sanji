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
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: ChatTool['input_schema'];
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

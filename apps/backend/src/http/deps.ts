import type { ConfigDto, ProviderAdapter } from '@sanji/shared';
import type Database from 'better-sqlite3';
import type { Embedder } from '../embeddings/embedder.js';
import type { Indexer } from '../index/indexer.js';
import type { IndexRepo } from '../index/repo.js';
import type { IngestService } from '../ingest/service.js';
import type { Registry } from '../tools/registry.js';
import type { Skill } from '../skills/parse.js';
import type { VaultPaths } from '../config/paths.js';

export type ServerDeps =
  | { kind: 'no-vault' }
  | {
      kind: 'ready';
      paths: VaultPaths;
      cfg: ConfigDto;
      db: Database.Database;
      repo: IndexRepo;
      embedder: Embedder;
      adapter: ProviderAdapter;
      registry: Registry;
      skills: readonly Skill[];
      ingestService: IngestService;
      indexer: Indexer;
    };

import { readFile, stat } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import type { Db } from '../db/client.js';
import type { Embedder } from '../embeddings/embedder.js';
import { chunkBody } from '../vault/chunk.js';
import { parseNote } from '../vault/parse.js';
import { IndexRepo } from './repo.js';

export interface IndexerOptions {
  chunkSizeTokens: number;
  chunkOverlapTokens: number;
}

export interface IndexStats {
  notesIndexed: number;
  chunksIndexed: number;
  notesSkipped: number;
}

export interface IndexFileResult {
  chunksIndexed: number;
  skipped: boolean;
}

const SKIP_DIRS = new Set(['.sanji', '.git', 'node_modules']);

export class Indexer {
  private repo: IndexRepo;

  constructor(
    private db: Db,
    private embedder: Embedder,
    private opts: IndexerOptions,
  ) {
    this.repo = new IndexRepo(db);
  }

  async indexAll(vaultRoot: string): Promise<IndexStats> {
    const stats: IndexStats = { notesIndexed: 0, chunksIndexed: 0, notesSkipped: 0 };
    for (const file of walkMarkdown(vaultRoot)) {
      const rel = relative(vaultRoot, file);
      const result = await this.indexFile(vaultRoot, rel);
      if (result.skipped) {
        stats.notesSkipped += 1;
        continue;
      }
      stats.notesIndexed += 1;
      stats.chunksIndexed += result.chunksIndexed;
    }
    return stats;
  }

  async indexFile(vaultRoot: string, relPath: string): Promise<IndexFileResult> {
    const abs = join(vaultRoot, relPath);
    const st = await stat(abs);
    const existing = this.repo.getNote(relPath);
    if (existing && existing.mtimeMs === st.mtimeMs) {
      return { chunksIndexed: 0, skipped: true };
    }
    const source = await readFile(abs, 'utf8');
    const { note, wikilinks } = parseNote(relPath, source, st.mtimeMs);
    this.repo.upsertNote(note);
    this.repo.replaceLinksForSource(relPath, wikilinks);

    const bodyChunks = chunkBody(note.body, {
      sizeTokens: this.opts.chunkSizeTokens,
      overlapTokens: this.opts.chunkOverlapTokens,
    });
    const upserts = await Promise.all(
      bodyChunks.map(async (c, idx) => ({
        chunkIndex: idx,
        text: c.text,
        startChar: c.startChar,
        endChar: c.endChar,
        embedding: await this.embedder.embed(c.text),
      })),
    );
    this.repo.replaceChunksForNote(relPath, upserts);
    return { chunksIndexed: upserts.length, skipped: false };
  }

  async indexDelete(relPath: string): Promise<void> {
    this.repo.deleteChunksForNote(relPath);
    this.repo.deleteLinksForSource(relPath);
    this.repo.deleteNote(relPath);
  }
}

function* walkMarkdown(root: string): Generator<string> {
  const entries = readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walkMarkdown(join(root, e.name));
      continue;
    }
    if (!e.isFile()) continue;
    if (extname(e.name).toLowerCase() !== '.md') continue;
    yield join(root, e.name);
  }
}

import { readFile, stat } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import type { Db } from '../db/client.js';
import type { Embedder } from '../embeddings/embedder.js';
import { chunkBody, formatChunkForEmbedding } from '../vault/chunk.js';
import { parseNote } from '../vault/parse.js';
import { generateContextBlurb, type BlurbDeps } from '../retrieval/contextual-blurb.js';
import { IndexRepo } from './repo.js';

export interface IndexerOptions {
  chunkSizeTokens: number;
  chunkOverlapTokens: number;
  /**
   * Optional contextual-blurb LLM (R1 Anthropic contextual retrieval). When
   * omitted, chunks persist with `context_text = null` and embeddings are
   * computed from title+trail+body only — i.e. contextual retrieval is off.
   * The HTTP bootstrap path wires Haiku 4.5 in; the eval harness leaves it
   * out so retrieval-only changes can be measured cheaply.
   */
  blurbLlm?: BlurbDeps['llm'];
  /** Max concurrent blurb generations per note. Default 5. */
  blurbConcurrency?: number;
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

  async indexAll(
    vaultRoot: string,
    opts?: { onProgress?: (done: number, total: number) => void },
  ): Promise<IndexStats> {
    const stats: IndexStats = { notesIndexed: 0, chunksIndexed: 0, notesSkipped: 0 };
    const files = [...walkMarkdown(vaultRoot)];
    let done = 0;
    for (const file of files) {
      const rel = relative(vaultRoot, file);
      const result = await this.indexFile(vaultRoot, rel);
      if (result.skipped) {
        stats.notesSkipped += 1;
      } else {
        stats.notesIndexed += 1;
        stats.chunksIndexed += result.chunksIndexed;
      }
      done += 1;
      opts?.onProgress?.(done, files.length);
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

    // Generate contextual blurbs in parallel with a concurrency cap. When no
    // blurbLlm is wired in, we skip the call entirely and persist null.
    const blurbLlm = this.opts.blurbLlm;
    const concurrency = Math.max(1, this.opts.blurbConcurrency ?? 5);
    const blurbs: Array<string | null> = new Array(bodyChunks.length).fill(null);
    if (blurbLlm) {
      let cursor = 0;
      const docTitle = note.title ?? relPath;
      const worker = async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= bodyChunks.length) return;
          const c = bodyChunks[idx]!;
          try {
            const blurb = await generateContextBlurb(
              {
                docTitle,
                docBody: note.body,
                chunkText: c.text,
                headerTrail: c.headerTrail,
              },
              { llm: blurbLlm },
            );
            blurbs[idx] = blurb || null;
          } catch (err) {
            // Don't fail the whole index on a blurb error; degrade to null.
            process.stderr.write(
              `blurb generation failed for ${relPath}#${idx}: ${
                err instanceof Error ? err.message : String(err)
              }\n`,
            );
            blurbs[idx] = null;
          }
        }
      };
      const workers = Array.from({ length: Math.min(concurrency, bodyChunks.length) }, worker);
      await Promise.all(workers);
    }

    const upserts = await Promise.all(
      bodyChunks.map(async (c, idx) => {
        const contextText = blurbs[idx];
        return {
          chunkIndex: idx,
          text: c.text,
          startChar: c.startChar,
          endChar: c.endChar,
          headerTrail: c.headerTrail,
          contextText,
          embedding: await this.embedder.embed(
            formatChunkForEmbedding(c, { title: note.title }, { contextText }),
          ),
        };
      }),
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

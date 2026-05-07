/**
 * Retrieval eval harness for Sanji v0.1 RAG quality work.
 *
 * Bootstraps a fresh sqlite index against a configurable vault path, indexes
 * every markdown file, then runs each fixture query through the configured
 * retrieval method and reports recall@5 and MRR.
 *
 * Usage:
 *   RETRIEVAL_METHOD=fts|semantic|hybrid \
 *   pnpm -F @sanji/backend exec tsx scripts/retrieval-eval.ts [vault-path]
 *
 * Default vault path is the sample-vault at the repo root. The harness writes
 * a fresh /tmp sqlite db every run, so it's idempotent and leaves no state on
 * the source vault's .sanji directory.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { Indexer } from '../src/index/indexer.js';
import { IndexRepo } from '../src/index/repo.js';
import { FakeEmbedder, type Embedder } from '../src/embeddings/embedder.js';
import { TransformersEmbedder } from '../src/embeddings/transformers.js';
import { hybridSearchTool } from '../src/tools/hybrid-search.js';
import { resolveVaultPaths } from '../src/config/paths.js';
import type { ToolContext } from '../src/tools/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..', '..');
const DEFAULT_VAULT = join(REPO_ROOT, 'sample-vault');

interface Fixture {
  query: string;
  expected: string;
}

type Method = 'fts' | 'semantic' | 'hybrid';

function buildEmbedder(): Embedder {
  return process.env.SANJI_FAKE_EMBED === '1' ? new FakeEmbedder() : new TransformersEmbedder();
}

function getMethod(): Method {
  const m = (process.env.RETRIEVAL_METHOD ?? 'semantic').toLowerCase();
  if (m !== 'fts' && m !== 'semantic' && m !== 'hybrid') {
    throw new Error(`unknown RETRIEVAL_METHOD=${m} (expected fts|semantic|hybrid)`);
  }
  return m;
}

/**
 * Build a permissive FTS5 MATCH expression by quoting each whitespace token.
 * This avoids parse errors on punctuation (hyphens, slashes, etc.) and keeps
 * the harness focused on retrieval quality rather than query syntax.
 */
function ftsExpr(query: string): string {
  const tokens = query
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter((t) => t.length > 0)
    .map((t) => `"${t}"`);
  return tokens.join(' OR ');
}

function dedupeByPath(paths: string[], k: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= k) break;
  }
  return out;
}

async function topPathsForQuery(
  method: Method,
  query: string,
  db: ReturnType<typeof openDb>,
  repo: IndexRepo,
  embedder: Embedder,
  k: number,
  vaultPath: string,
): Promise<string[]> {
  if (method === 'fts') {
    const expr = ftsExpr(query);
    if (!expr) return [];
    // Pull a few extra rows since FTS hits are already note-level.
    const rows = db
      .prepare('SELECT path FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?')
      .all(expr, k) as Array<{ path: string }>;
    return dedupeByPath(rows.map((r) => r.path), k);
  }
  if (method === 'semantic') {
    const vec = await embedder.embed(query);
    // Pull more chunks than k so dedupe-by-path can still produce k notes.
    const hits = repo.knnChunks(vec, k * 4);
    return dedupeByPath(hits.map((h) => h.notePath), k);
  }
  if (method === 'hybrid') {
    const ctx: ToolContext = {
      paths: resolveVaultPaths(vaultPath),
      db,
      repo,
      embedder,
    };
    const out = await hybridSearchTool.run({ query, limit: k * 4 }, ctx);
    const hits = JSON.parse(out) as Array<{ path: string }>;
    return dedupeByPath(hits.map((h) => h.path), k);
  }
  throw new Error(`unknown retrieval method=${method}`);
}

function pad(s: string, w: number): string {
  if (s.length >= w) return s.slice(0, w - 1) + '…';
  return s + ' '.repeat(w - s.length);
}

async function main() {
  const method = getMethod();
  const vaultPath = process.argv[2] ?? DEFAULT_VAULT;
  const fixturesPath = join(__dirname, 'retrieval-eval.fixtures.json');
  const fixtures: Fixture[] = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

  const dbPath = `/tmp/sanji-eval-${Date.now()}.db`;
  const db = openDb(dbPath);
  runMigrations(db);
  const embedder = buildEmbedder();
  const repo = new IndexRepo(db);

  try {
    console.log(`[eval] method=${method} vault=${vaultPath} db=${dbPath}`);
    const indexer = new Indexer(db, embedder, {
      chunkSizeTokens: 500,
      chunkOverlapTokens: 50,
    });
    const t0 = Date.now();
    const stats = await indexer.indexAll(vaultPath);
    console.log(
      `[eval] indexed ${stats.notesIndexed} notes / ${stats.chunksIndexed} chunks in ${(
        (Date.now() - t0) /
        1000
      ).toFixed(1)}s`,
    );

    const K = 5;
    const headers = ['Query', 'Expected', 'Top1Path', 'R@5', 'Rank'];
    const widths = [42, 38, 38, 4, 5];
    console.log();
    console.log(headers.map((h, i) => pad(h, widths[i]!)).join('  '));
    console.log(widths.map((w) => '-'.repeat(w)).join('  '));

    let hits = 0;
    let mrrSum = 0;
    for (const fx of fixtures) {
      const top = await topPathsForQuery(method, fx.query, db, repo, embedder, K, vaultPath);
      const rank = top.indexOf(fx.expected);
      const recall = rank >= 0;
      if (recall) hits += 1;
      const reciprocal = recall ? 1 / (rank + 1) : 0;
      mrrSum += reciprocal;
      const row = [
        pad(fx.query, widths[0]!),
        pad(fx.expected, widths[1]!),
        pad(top[0] ?? '(none)', widths[2]!),
        pad(recall ? 'Y' : 'N', widths[3]!),
        pad(recall ? String(rank + 1) : '-', widths[4]!),
      ];
      console.log(row.join('  '));
    }

    const recall5 = hits / fixtures.length;
    const mrr = mrrSum / fixtures.length;
    console.log();
    console.log(`[eval] method=${method}  Recall@5 = ${hits}/${fixtures.length} = ${recall5.toFixed(3)}`);
    console.log(`[eval] method=${method}  MRR      = ${mrr.toFixed(3)}`);
  } finally {
    await embedder.close();
    db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Command } from 'commander';
import { openDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { Indexer } from './index/indexer.js';
import { IndexRepo } from './index/repo.js';
import { resolveVaultPaths } from './config/paths.js';
import { loadOrInitConfig } from './config/loader.js';
import { FakeEmbedder, type Embedder } from './embeddings/embedder.js';
import { TransformersEmbedder } from './embeddings/transformers.js';
import { makeAdapter } from './llm/factory.js';
import { runAgent } from './agent/run.js';
import { loadSkills } from './skills/loader.js';
import { Registry } from './tools/registry.js';
import { readNoteTool } from './tools/read-note.js';
import { searchVaultTool } from './tools/search-vault.js';
import { semanticSearchTool } from './tools/semantic-search.js';
import { getNeighborsTool } from './tools/get-neighbors.js';
import { writeNoteTool } from './tools/write-note.js';
import type { ToolContext } from './tools/types.js';
import type { ChatEvent, ChatOpts, ProviderAdapter } from '@sanji/shared';

function buildEmbedder(): Embedder {
  return process.env.SANJI_FAKE_EMBED === '1' ? new FakeEmbedder() : new TransformersEmbedder();
}

class OfflineFakeAdapter implements ProviderAdapter {
  async *chat(opts: ChatOpts): AsyncIterable<ChatEvent> {
    yield { type: 'text_delta', text: `[offline-fake reply for model=${opts.model}]` };
    yield { type: 'message_stop', usage: { input: 0, output: 0 } };
  }
  async getAvailableModels() { return []; }
  async testCredentials() { return { ok: true }; }
}

const program = new Command();
program.name('sanji').description('Sanji v0.1 CLI harness').version('0.0.1');
program.requiredOption('--vault <path>', 'path to the markdown vault');

program
  .command('init')
  .description('Create .sanji/, write a default config, run migrations.')
  .action(async () => {
    const paths = resolveVaultPaths(program.opts().vault);
    loadOrInitConfig(paths);
    const db = openDb(paths.indexDb);
    try {
      runMigrations(db);
    } finally {
      db.close();
    }
    console.log(`initialized .sanji at ${paths.sanjiDir}`);
  });

program
  .command('index')
  .description('Index every markdown file under the vault.')
  .action(async () => {
    const paths = resolveVaultPaths(program.opts().vault);
    const cfg = loadOrInitConfig(paths);
    const db = openDb(paths.indexDb);
    const embedder = buildEmbedder();
    try {
      runMigrations(db);
      const ix = new Indexer(db, embedder, {
        chunkSizeTokens: cfg.indexing.chunk_size_tokens,
        chunkOverlapTokens: cfg.indexing.chunk_overlap_tokens,
      });
      const stats = await ix.indexAll(paths.vault);
      console.log(
        `notes: ${stats.notesIndexed}  chunks: ${stats.chunksIndexed}  skipped: ${stats.notesSkipped}`,
      );
    } finally {
      await embedder.close();
      db.close();
    }
  });

program
  .command('search <query>')
  .description('FTS5 keyword search.')
  .option('-n, --limit <n>', 'max hits', '5')
  .action(async (query: string, opts: { limit: string }) => {
    const paths = resolveVaultPaths(program.opts().vault);
    loadOrInitConfig(paths);
    const db = openDb(paths.indexDb);
    try {
      runMigrations(db);
      const rows = db
        .prepare(
          "SELECT path, title, snippet(notes_fts, 2, '[', ']', '…', 8) AS preview FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?",
        )
        .all(query, Number(opts.limit)) as Array<{ path: string; title: string | null; preview: string }>;
      for (const r of rows) console.log(`${r.path}\t${r.title ?? ''}\t${r.preview}`);
    } finally {
      db.close();
    }
  });

program
  .command('ssearch <query>')
  .description('Semantic search via sqlite-vec.')
  .option('-n, --limit <n>', 'max hits', '5')
  .action(async (query: string, opts: { limit: string }) => {
    const paths = resolveVaultPaths(program.opts().vault);
    loadOrInitConfig(paths);
    const db = openDb(paths.indexDb);
    const embedder = buildEmbedder();
    try {
      runMigrations(db);
      const vec = await embedder.embed(query);
      const hits = new IndexRepo(db).knnChunks(vec, Number(opts.limit));
      for (const h of hits) console.log(`${h.notePath}#${h.chunkIndex}\tdistance=${h.distance.toFixed(4)}\t${h.text.slice(0, 80)}`);
    } finally {
      await embedder.close();
      db.close();
    }
  });

program
  .command('ask <message>')
  .description('Run the agent against the vault using a built-in or user skill.')
  .action(async (message: string) => {
    const paths = resolveVaultPaths(program.opts().vault);
    const cfg = loadOrInitConfig(paths);
    const db = openDb(paths.indexDb);
    runMigrations(db);
    const embedder = buildEmbedder();

    const adapter: ProviderAdapter = process.env.SANJI_OFFLINE_FAKE_LLM === '1'
      ? new OfflineFakeAdapter()
      : makeAdapter(cfg);

    try {
      const { skills, errors } = await loadSkills(paths);
      for (const e of errors) {
        process.stderr.write(`skill load error: ${e.source}: ${e.message}\n`);
      }
      if (skills.length === 0) {
        process.stderr.write('no skills loaded -- run a fresh `sanji init`?\n');
        process.exitCode = 1;
        return;
      }

      const registry = new Registry();
      registry.register(readNoteTool);
      registry.register(searchVaultTool);
      registry.register(semanticSearchTool);
      registry.register(getNeighborsTool);
      registry.register(writeNoteTool);

      const ctx: ToolContext = { paths, db, repo: new IndexRepo(db), embedder };

      const stream = runAgent(
        { adapter, registry, ctx, skills, defaultModel: cfg.models.default },
        message,
      );

      let stats: { skill: string; toolCalls: number } | undefined;
      while (true) {
        const r = await stream.next();
        if (r.done) { stats = r.value; break; }
        const ev = r.value;
        if (ev.type === 'text_delta') process.stdout.write(ev.text);
        else if (ev.type === 'tool_use_complete') process.stderr.write(`\n[tool] ${ev.name} ${JSON.stringify(ev.input)}\n`);
        else if (ev.type === 'error') process.stderr.write(`\nerror: ${ev.message}\n`);
      }
      process.stdout.write('\n');
      if (stats) process.stdout.write(`skill: ${stats.skill}  tools: ${stats.toolCalls}\n`);
    } finally {
      await embedder.close();
      db.close();
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Hono } from 'hono';
import { healthRoute } from './routes/health.js';
import { configRoute } from './routes/config.js';
import { onboardingRoute } from './routes/onboarding.js';
import { vaultRoute } from './routes/vault.js';
import { notesRoute } from './routes/notes.js';
import { chatRoute } from './routes/chat.js';
import { indexingRoute } from './routes/indexing.js';
import { ingestRoute } from './routes/ingest.js';
import { Indexer } from '../index/indexer.js';
import { makeBlurbLlm } from '../retrieval/contextual-blurb-deps.js';
import { makeRewriterLlm } from '../retrieval/rewriter-deps.js';
import { rewriteQuery } from '../retrieval/rewriter.js';
import type { ServerDeps } from './deps.js';
import { teardownReadyDeps, type ReadyDeps } from './bootstrap.js';

export interface ServerHandle {
  app: Hono;
  swap: (next: ServerDeps) => void;
  current: () => ServerDeps;
}

function buildRoutes(
  deps: ServerDeps,
  swap: (next: ServerDeps) => Promise<void>,
): Hono {
  const app = new Hono();
  app.route('/', healthRoute);
  app.route('/', onboardingRoute({ onReady: swap }));

  if (deps.kind === 'ready') {
    app.route('/', configRoute({ paths: deps.paths }));
    app.route('/', vaultRoute({ db: deps.db, paths: deps.paths }));
    app.route('/', notesRoute({ paths: deps.paths, repo: deps.repo }));
    app.route(
      '/',
      chatRoute({
        deps: {
          adapter: deps.adapter,
          registry: deps.registry,
          ctx: {
            paths: deps.paths,
            db: deps.db,
            repo: deps.repo,
            embedder: deps.embedder,
            rewriter: ((rewriterLlm) => (q: string) =>
              rewriteQuery(q, { llm: rewriterLlm }))(makeRewriterLlm(deps.adapter)),
          },
          skills: deps.skills,
          defaultModel: deps.cfg.models.default,
        },
      }),
    );
    const runIndex = async (
      cb: (done: number, total: number) => void | Promise<void>,
    ) => {
      const ix = new Indexer(deps.db, deps.embedder, {
        chunkSizeTokens: deps.cfg.indexing.chunkSizeTokens,
        chunkOverlapTokens: deps.cfg.indexing.chunkOverlapTokens,
        blurbLlm: makeBlurbLlm(deps.adapter),
      });
      await ix.indexAll(deps.paths.vault, { onProgress: cb });
    };
    app.route('/', indexingRoute({ runIndex }));
    app.route('/', ingestRoute({ service: deps.ingestService }));
  }

  return app;
}

/**
 * Build a Hono app whose internal route table can be swapped at runtime.
 *
 * The returned `app` is a thin proxy that forwards every request to a
 * private `active` Hono instance. When the onboarding init handler calls
 * `swap(readyDeps)`, the proxy starts forwarding to a freshly built routes
 * tree that includes the `kind:'ready'` endpoints. Tests and the boot
 * entry point both call `app.request(...)` / `app.fetch(...)` exactly as
 * before — the proxy is observably indistinguishable from a regular Hono.
 *
 * Previous `kind:'ready'` resources (db handle, embedder) are torn down
 * a tick after the swap so any in-flight request finishes against the old
 * deps before they close.
 */
export function makeServer(initial: ServerDeps): ServerHandle {
  let current: ServerDeps = initial;
  let active: Hono = buildRoutes(initial, async (next) => doSwap(next));

  async function doSwap(next: ServerDeps): Promise<void> {
    const previous = current;
    current = next;
    active = buildRoutes(next, async (n) => doSwap(n));
    if (previous.kind === 'ready') {
      // Defer teardown so the in-flight request that triggered the swap
      // (and any sibling readers) finish against the old deps.
      const old: ReadyDeps = previous;
      setTimeout(() => {
        void teardownReadyDeps(old);
      }, 250);
    }
  }

  const proxy = new Hono();
  proxy.all('*', (c) => active.fetch(c.req.raw));

  return {
    app: proxy,
    swap: (deps) => {
      void doSwap(deps);
    },
    current: () => current,
  };
}

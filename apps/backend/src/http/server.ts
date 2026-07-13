import { Hono } from 'hono';
import { healthRoute } from './routes/health.js';
import { configRoute } from './routes/config.js';
import { onboardingRoute } from './routes/onboarding.js';
import { vaultRoute } from './routes/vault.js';
import { notesRoute } from './routes/notes.js';
import { foldersRoute } from './routes/folders.js';
import { chatRoute } from './routes/chat.js';
import { indexingRoute } from './routes/indexing.js';
import { ingestRoute } from './routes/ingest.js';
import { makeRewriterLlm } from '../retrieval/rewriter-deps.js';
import { rewriteQuery } from '../retrieval/rewriter.js';
import type { ServerDeps } from './deps.js';
import { teardownReadyDeps, type ReadyDeps } from './bootstrap.js';

export interface ServerHandle {
  app: Hono;
  /**
   * Swap the live route table to a new dependency tree. Resolves once the
   * NEW generation is wired up and serving — teardown of the previous
   * generation's ready-deps runs in the background and is NOT awaited
   * here, so the request that triggered the swap (which is itself counted
   * in the previous generation's inflight counter via the proxy) does
   * not deadlock against its own drain. Use `awaitLastTeardown()` in
   * tests if you need to observe the teardown completing.
   */
  swap: (next: ServerDeps) => Promise<void>;
  current: () => ServerDeps;
  /**
   * Test seam: resolves when the most recently retired generation has
   * finished tearing down (or null when nothing has been retired yet).
   * Production code shouldn't need this — onboarding init returns 200 as
   * soon as the new routes are live; teardown of the old deps continues
   * in the background.
   */
  awaitLastTeardown(): Promise<void> | null;
}

export interface MakeServerOptions {
  /**
   * Test seam: invoked immediately before the retired generation's ready
   * deps are torn down. Defaults to a noop. Lets a test assert that
   * teardown waits for in-flight requests against the old generation to
   * finish before firing, without spying on the real teardown path.
   */
  onBeforeTeardown?: (deps: ReadyDeps) => void;
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
    app.route('/', notesRoute({ paths: deps.paths, repo: deps.repo, indexer: deps.indexer }));
    app.route('/', foldersRoute({ paths: deps.paths, repo: deps.repo, indexer: deps.indexer }));
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
    // Uses the shared Indexer instance from bootstrap so the contextual-blurb
    // wiring is consistent across full-vault indexing, post-ingest single-file
    // indexing, and post-rename single-file indexing.
    const runIndex = async (
      cb: (done: number, total: number) => void | Promise<void>,
    ) => {
      await deps.indexer.indexAll(deps.paths.vault, { onProgress: cb });
    };
    app.route('/', indexingRoute({ runIndex }));
    app.route(
      '/',
      ingestRoute({ service: deps.ingestService, maxUploadBytes: deps.maxUploadBytes }),
    );
  }

  return app;
}

/**
 * One generation of the routes table: the deps it was built with, the live
 * Hono instance, and a running count of in-flight requests served against
 * it. We tear ready-deps down only after the generation has been swapped
 * out AND its in-flight count hits zero, so SSE streams and long LLM
 * calls running against the old `db` / `embedder` finish cleanly instead
 * of crashing with closed-database errors mid-stream.
 *
 * Bounded fallback: `TEARDOWN_HARD_TIMEOUT_MS` forces teardown even if
 * something hangs forever (rare, but worth not leaking the db handle on).
 */
interface Generation {
  deps: ServerDeps;
  hono: Hono;
  inflight: number;
  retired: boolean;
}

const TEARDOWN_HARD_TIMEOUT_MS = 30_000;

/**
 * Build a Hono app whose internal route table can be swapped at runtime.
 *
 * The returned `app` is a thin proxy that forwards every request to the
 * current generation's Hono. When the onboarding init handler calls
 * `swap(readyDeps)`, the proxy starts forwarding to a freshly built routes
 * tree that includes the `kind:'ready'` endpoints. Tests and the boot
 * entry point both call `app.request(...)` / `app.fetch(...)` exactly as
 * before — the proxy is observably indistinguishable from a regular Hono.
 *
 * Previous `kind:'ready'` resources (db handle, embedder) are torn down
 * only after every in-flight request against the old generation finishes,
 * or after `TEARDOWN_HARD_TIMEOUT_MS` as a last-resort safety valve.
 */
export function makeServer(initial: ServerDeps, options: MakeServerOptions = {}): ServerHandle {
  let active: Generation = {
    deps: initial,
    hono: buildRoutes(initial, async (next) => doSwap(next)),
    inflight: 0,
    retired: false,
  };

  function scheduleTeardown(gen: Generation): Promise<void> {
    if (gen.deps.kind !== 'ready') return Promise.resolve();
    const old: ReadyDeps = gen.deps;
    return new Promise<void>((resolve) => {
      let done = false;
      let tick: ReturnType<typeof setInterval> | null = null;
      let hardStop: ReturnType<typeof setTimeout> | null = null;
      const fire = () => {
        if (done) return;
        done = true;
        // Always cancel both timers — the hard-timeout path used to leak
        // the polling interval until process exit because fire() ran
        // from the setTimeout callback without clearing setInterval.
        if (tick !== null) clearInterval(tick);
        if (hardStop !== null) clearTimeout(hardStop);
        options.onBeforeTeardown?.(old);
        void teardownReadyDeps(old).finally(resolve);
      };
      hardStop = setTimeout(fire, TEARDOWN_HARD_TIMEOUT_MS);
      // Poll cheaply for drain. The proxy is the only path that mutates
      // inflight, so this resolves the first tick after the last response
      // body settles (TransformStream `flush` fires on close).
      tick = setInterval(() => {
        if (gen.inflight <= 0) fire();
      }, 25);
    });
  }

  let lastTeardown: Promise<void> | null = null;

  async function doSwap(next: ServerDeps): Promise<void> {
    const previous = active;
    previous.retired = true;
    active = {
      deps: next,
      hono: buildRoutes(next, async (n) => doSwap(n)),
      inflight: 0,
      retired: false,
    };
    // Fire teardown in the background. The request that triggered this
    // swap is itself counted in `previous.inflight` via the proxy, so
    // awaiting drain here would deadlock until the 30s hard-stop and
    // then close db/embedder underneath any sibling in-flight requests.
    // Background teardown lets the init handler return immediately while
    // drain detection continues to wait for genuine in-flight work to
    // finish before closing resources.
    lastTeardown = scheduleTeardown(previous);
  }

  const proxy = new Hono();
  proxy.all('*', async (c) => {
    const gen = active;
    gen.inflight++;
    let decremented = false;
    const decOnce = () => {
      if (decremented) return;
      decremented = true;
      gen.inflight--;
    };
    let response: Response;
    try {
      response = await gen.hono.fetch(c.req.raw);
    } catch (err) {
      decOnce();
      throw err;
    }
    // For SSE / streaming responses the body is a ReadableStream that
    // outlives the handler return. Wrap it in a passthrough TransformStream
    // so the inflight counter only drops once the body closes (or errors).
    // For non-streaming responses (no body, or a Response whose body the
    // client never reads), decrement immediately — the work is done.
    if (response.body) {
      const passthrough = new TransformStream({
        flush() { decOnce(); },
      });
      // If the upstream errors mid-stream, we still need to decrement; the
      // pipe() chain swallows the error here (we deliberately catch it so
      // the proxy doesn't unhandled-reject) and forwards it to the wrapped
      // body via the writer's error path.
      response.body.pipeTo(passthrough.writable).catch(() => decOnce());
      return new Response(passthrough.readable, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    decOnce();
    return response;
  });

  return {
    app: proxy,
    swap: (deps) => doSwap(deps),
    current: () => active.deps,
    awaitLastTeardown: () => lastTeardown,
  };
}

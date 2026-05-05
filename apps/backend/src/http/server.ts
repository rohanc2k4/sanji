import { Hono } from 'hono';
import { healthRoute } from './routes/health.js';
import { configRoute } from './routes/config.js';
import { onboardingRoute } from './routes/onboarding.js';
import { vaultRoute } from './routes/vault.js';
import { notesRoute } from './routes/notes.js';
import { chatRoute } from './routes/chat.js';
import type { ServerDeps } from './deps.js';

export function makeServer(deps: ServerDeps): Hono {
  const app = new Hono();
  app.route('/', healthRoute);
  app.route('/', onboardingRoute());
  if (deps.kind === 'ready') {
    app.route('/', configRoute({ paths: deps.paths }));
    app.route('/', vaultRoute({ db: deps.db, paths: deps.paths }));
    app.route('/', notesRoute({ paths: deps.paths }));
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
          },
          skills: deps.skills,
          defaultModel: deps.cfg.models.default,
        },
      }),
    );
  }
  // Routes T9 mounts here as it lands.
  return app;
}


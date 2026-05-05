import { Hono } from 'hono';
import { healthRoute } from './routes/health.js';
import { configRoute } from './routes/config.js';
import { onboardingRoute } from './routes/onboarding.js';
import { vaultRoute } from './routes/vault.js';
import type { ServerDeps } from './deps.js';

export function makeServer(deps: ServerDeps): Hono {
  const app = new Hono();
  app.route('/', healthRoute);
  app.route('/', onboardingRoute());
  if (deps.kind === 'ready') {
    app.route('/', configRoute({ paths: deps.paths }));
    app.route('/', vaultRoute({ db: deps.db, paths: deps.paths }));
  }
  // Routes T7–T9 mount here as they land.
  return app;
}


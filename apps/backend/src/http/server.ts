import { Hono } from 'hono';
import { healthRoute } from './routes/health.js';
import { configRoute } from './routes/config.js';
import type { ServerDeps } from './deps.js';

export function makeServer(deps: ServerDeps): Hono {
  const app = new Hono();
  app.route('/', healthRoute);
  if (deps.kind === 'ready') {
    app.route('/', configRoute({ paths: deps.paths }));
  }
  // Routes T5–T9 mount here as they land.
  return app;
}

import { Hono } from 'hono';
import { healthRoute } from './routes/health.js';
import type { ServerDeps } from './deps.js';

export function makeServer(deps: ServerDeps): Hono {
  const app = new Hono();
  app.route('/', healthRoute);
  // Routes T4–T9 mount here as they land.
  return app;
}

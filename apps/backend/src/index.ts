import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { SANJI_VERSION } from '@sanji/shared';

const app = new Hono();

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'sanji-backend', version: SANJI_VERSION }),
);

app.get('/', (c) =>
  c.text('Sanji backend is running. Frontend dev server is on :5173. See README.md.'),
);

const port = Number(process.env.PORT ?? 8080);
console.log(`Sanji backend listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

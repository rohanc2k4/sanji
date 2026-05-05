import { Hono } from 'hono';
import { SANJI_VERSION } from '@sanji/shared';

export const healthRoute = new Hono();

healthRoute.get('/health', (c) =>
  c.json({ status: 'ok', service: 'sanji-backend', version: SANJI_VERSION }),
);

healthRoute.get('/', (c) =>
  c.text('Sanji backend is running. Frontend dev server is on :5173. See README.md.'),
);

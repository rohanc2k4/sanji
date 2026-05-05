import { serve } from '@hono/node-server';
import { makeServer } from './http/server.js';

const app = makeServer({ kind: 'no-vault' });
const port = Number(process.env.PORT ?? 8080);
console.log(`Sanji backend listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

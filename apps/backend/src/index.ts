import { serve } from '@hono/node-server';
import { makeServer } from './http/server.js';

const handle = makeServer({ kind: 'no-vault' });
const port = Number(process.env.PORT ?? 8080);
console.log(`Sanji backend listening on http://localhost:${port}`);
serve({ fetch: handle.app.fetch, port });

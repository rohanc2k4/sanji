import { describe, expect, it } from 'vitest';
import { makeServer } from './server.js';

describe('makeServer', () => {
  it('serves /health with the version', async () => {
    const app = makeServer({ kind: 'no-vault' });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; service: string; version: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('sanji-backend');
    expect(typeof body.version).toBe('string');
  });

  it('serves the root marketing line', async () => {
    const app = makeServer({ kind: 'no-vault' });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/sanji backend/i);
  });
});

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { indexingRoute } from './indexing.js';

describe('indexing route', () => {
  it('streams progress events from a runIndex callback', async () => {
    const fakeRun = async (
      cb: (done: number, total: number) => void | Promise<void>,
    ) => {
      await cb(1, 3);
      await cb(2, 3);
      await cb(3, 3);
    };
    const app = new Hono();
    app.route('/', indexingRoute({ runIndex: fakeRun }));
    const res = await app.request('/api/indexing/status');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toContain('"notesIndexed":1');
    expect(text).toContain('"notesTotal":3');
    expect(text).toContain('"notesIndexed":3');
    expect(text).toMatch(/event: done/);
  });

  it('emits an error event when runIndex throws', async () => {
    const fakeRun = async () => {
      throw new Error('boom');
    };
    const app = new Hono();
    app.route('/', indexingRoute({ runIndex: fakeRun }));
    const res = await app.request('/api/indexing/status');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/event: error/);
    expect(text).toContain('boom');
  });
});

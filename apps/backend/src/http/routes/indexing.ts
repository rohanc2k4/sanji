import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { IndexingStatusEvent } from '@sanji/shared';

export function indexingRoute(opts: {
  runIndex: (
    onProgress: (done: number, total: number) => void | Promise<void>,
  ) => Promise<void>;
}) {
  const r = new Hono();
  r.get('/api/indexing/status', (c) =>
    streamSSE(c, async (stream) => {
      let lastDone = 0;
      try {
        await opts.runIndex(async (done, total) => {
          lastDone = done;
          const ev: IndexingStatusEvent = {
            kind: 'progress',
            notesIndexed: done,
            notesTotal: total,
          };
          await stream.writeSSE({ event: 'progress', data: JSON.stringify(ev) });
        });
        const ev: IndexingStatusEvent = { kind: 'done', notesIndexed: lastDone };
        await stream.writeSSE({ event: 'done', data: JSON.stringify(ev) });
      } catch (err) {
        const ev: IndexingStatusEvent = {
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        };
        await stream.writeSSE({ event: 'error', data: JSON.stringify(ev) });
      }
    }),
  );
  return r;
}

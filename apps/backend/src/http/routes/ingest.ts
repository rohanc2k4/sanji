import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { IngestService, IngestJob } from '../../ingest/service.js';

const TextBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  format_hint: z.string().optional(),
});

export interface IngestRouteDeps {
  service: IngestService;
}

export function ingestRoute(deps: IngestRouteDeps) {
  const r = new Hono();

  r.post('/api/ingest/text', async (c) => {
    const parsed = TextBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { kind: 'api-error', code: 'BAD_BODY', message: parsed.error.message },
        400,
      );
    }
    const fileId = randomUUID();
    const ctrl = new AbortController();
    const job: IngestJob = {
      fileId,
      source: {
        kind: 'paste',
        title: parsed.data.title,
        content: parsed.data.content,
        format_hint: parsed.data.format_hint,
      },
      abortController: ctrl,
    };
    // When the client aborts the SSE fetch (Cancel button), Hono surfaces it
    // on c.req.raw.signal. Forward that into the service so it aborts the
    // in-flight LLM rewrite — otherwise the rewrite continues to completion
    // server-side and a "cancelled" job still writes to the inbox.
    const onClientAbort = () => deps.service.cancel(fileId);
    c.req.raw.signal.addEventListener('abort', onClientAbort, { once: true });
    return streamSSE(c, async (stream) => {
      try {
        for await (const ev of deps.service.enqueue(job)) {
          await stream.writeSSE({ event: 'ingest', data: JSON.stringify(ev) });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await stream.writeSSE({
          event: 'ingest',
          data: JSON.stringify({
            kind: 'error', fileId, sourceName: parsed.data.title,
            phase: 'rewrite', message: `Unexpected error: ${msg}`,
          }),
        });
      }
    });
  });

  r.post('/api/ingest/file', async (c) => {
    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return c.json(
        { kind: 'api-error', code: 'BAD_BODY', message: 'file field required' },
        400,
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const fileId = randomUUID();
    const ctrl = new AbortController();
    const job: IngestJob = {
      fileId,
      source: { kind: 'file', data: buf, filename: file.name },
      abortController: ctrl,
    };
    // When the client aborts the SSE fetch (Cancel button), Hono surfaces it
    // on c.req.raw.signal. Forward that into the service so it aborts the
    // in-flight LLM rewrite — otherwise the rewrite continues to completion
    // server-side and a "cancelled" job still writes to the inbox.
    const onClientAbort = () => deps.service.cancel(fileId);
    c.req.raw.signal.addEventListener('abort', onClientAbort, { once: true });
    return streamSSE(c, async (stream) => {
      try {
        for await (const ev of deps.service.enqueue(job)) {
          await stream.writeSSE({ event: 'ingest', data: JSON.stringify(ev) });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await stream.writeSSE({
          event: 'ingest',
          data: JSON.stringify({
            kind: 'error', fileId, sourceName: file.name,
            phase: 'rewrite', message: `Unexpected error: ${msg}`,
          }),
        });
      }
    });
  });

  return r;
}

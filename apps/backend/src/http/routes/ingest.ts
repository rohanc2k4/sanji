import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
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
  /**
   * Hard cap on multipart and JSON ingest bodies in bytes. Defends against
   * one large/malicious upload OOM-ing the backend by buffering the body
   * into memory before extraction even starts. Caller wires this from
   * `cfg.ingestion.max_upload_bytes`.
   */
  maxUploadBytes: number;
  /**
   * Hard cap on the SUM of in-flight upload bytes across concurrent
   * requests. Per-request bodyLimit alone is not enough: N concurrent
   * clients can each buffer up to `maxUploadBytes` while only one job
   * runs in the service queue. We reject (503) the (N+1)th request
   * whose Content-Length would push us over this cap. Defaults to
   * 2 × maxUploadBytes (~50 MiB at the default).
   */
  maxConcurrentUploadBytes?: number;
}

// Module-scoped so a process-wide cap holds across all ingestRoute
// invocations. v0.1 only ever creates one instance per ready generation,
// but this is cheap insurance and makes the limit observable in tests.
let globalInflightUploadBytes = 0;

const tooLarge = (c: import('hono').Context) =>
  c.json(
    {
      kind: 'api-error',
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Upload exceeds the ingestion size limit.',
    },
    413,
  );

export function ingestRoute(deps: IngestRouteDeps) {
  const r = new Hono();
  const limit = bodyLimit({ maxSize: deps.maxUploadBytes, onError: tooLarge });
  const concurrentCap = deps.maxConcurrentUploadBytes ?? deps.maxUploadBytes * 2;

  /**
   * Pre-buffer admission control. Read Content-Length (if present) and
   * reject early when the in-flight total would exceed `concurrentCap`.
   * Returns the estimated size we reserved, plus a release() that the
   * handler MUST call after the body has been consumed AND the stream
   * has fully drained — otherwise the counter leaks. When Content-Length
   * is missing we conservatively reserve `maxUploadBytes` as the worst
   * case so an unknown-size request can't sneak past the gate.
   */
  function admit(c: import('hono').Context): { release: () => void } | Response {
    const lenHeader = c.req.raw.headers.get('content-length');
    const estimate = lenHeader != null
      ? Math.min(Number(lenHeader) || 0, deps.maxUploadBytes)
      : deps.maxUploadBytes;
    if (globalInflightUploadBytes + estimate > concurrentCap) {
      return c.json(
        {
          kind: 'api-error',
          code: 'CONCURRENT_UPLOAD_LIMIT',
          message:
            'Too many uploads in flight. Wait for the current ingestions to finish, then retry.',
        },
        503,
      );
    }
    globalInflightUploadBytes += estimate;
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        globalInflightUploadBytes -= estimate;
      },
    };
  }

  r.post('/api/ingest/text', limit, async (c) => {
    const reservation = admit(c);
    if (reservation instanceof Response) return reservation;
    const parsed = TextBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      reservation.release();
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
      } finally {
        reservation.release();
      }
    });
  });

  r.post('/api/ingest/file', limit, async (c) => {
    const reservation = admit(c);
    if (reservation instanceof Response) return reservation;
    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      reservation.release();
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
      } finally {
        reservation.release();
      }
    });
  });

  return r;
}

/** Test-only: read the current global upload counter. */
export function __inflightUploadBytesForTest(): number {
  return globalInflightUploadBytes;
}

/** Test-only: reset the global counter between cases. */
export function __resetInflightUploadBytesForTest(): void {
  globalInflightUploadBytes = 0;
}

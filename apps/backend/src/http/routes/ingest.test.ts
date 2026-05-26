import { describe, expect, it, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  ingestRoute,
  __resetInflightUploadBytesForTest,
  __inflightUploadBytesForTest,
} from './ingest.js';
import type { IngestEvent } from '@sanji/shared';

class StubService {
  public lastJob: any = null;
  async *enqueue(job: any): AsyncGenerator<IngestEvent> {
    this.lastJob = job;
    yield { kind: 'queued', fileId: job.fileId, sourceName: 'fake' };
    yield { kind: 'done', fileId: job.fileId, sourceName: 'fake', outputPath: 'inbox/fake.md', tokensInput: 1, tokensOutput: 1 };
  }
  cancel(_fileId: string) {}
}

describe('ingest route', () => {
  beforeEach(() => {
    __resetInflightUploadBytesForTest();
  });

  it('POST /api/ingest/text streams ingest events as SSE', async () => {
    const stub = new StubService();
    const app = new Hono();
    app.route('/', ingestRoute({ service: stub as any, maxUploadBytes: 1024 * 1024 }));
    const res = await app.request('/api/ingest/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'demo', content: 'hello' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toMatch(/event: ingest/);
    expect(text).toContain('"kind":"queued"');
    expect(text).toContain('"kind":"done"');
    expect(stub.lastJob.source.kind).toBe('paste');
  });

  it('POST /api/ingest/text rejects empty title', async () => {
    const stub = new StubService();
    const app = new Hono();
    app.route('/', ingestRoute({ service: stub as any, maxUploadBytes: 1024 * 1024 }));
    const res = await app.request('/api/ingest/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '', content: 'hello' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/ingest/text rejects bodies over maxUploadBytes with 413', async () => {
    const stub = new StubService();
    const app = new Hono();
    // Tight cap so we can produce an oversize body cheaply.
    app.route('/', ingestRoute({ service: stub as any, maxUploadBytes: 1024 }));
    const oversize = JSON.stringify({ title: 'demo', content: 'x'.repeat(2048) });
    const res = await app.request('/api/ingest/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(oversize.length) },
      body: oversize,
    });
    expect(res.status).toBe(413);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('POST /api/ingest/file rejects multipart bodies over maxUploadBytes with 413', async () => {
    const stub = new StubService();
    const app = new Hono();
    app.route('/', ingestRoute({ service: stub as any, maxUploadBytes: 1024 }));
    const form = new FormData();
    form.append('file', new Blob(['x'.repeat(4096)], { type: 'text/plain' }), 'big.txt');
    const res = await app.request('/api/ingest/file', {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(413);
  });

  it('rejects further uploads with 503 once concurrent in-flight bytes exceed cap', async () => {
    // Per-request bodyLimit alone lets N concurrent clients each buffer up
    // to maxUploadBytes; the service queue is sequential but the buffers
    // stack in memory. Set maxConcurrentUploadBytes tight (= 1 per-request)
    // so the second request hits the cap and gets a 503.
    const stub = new StubService();
    const app = new Hono();
    app.route(
      '/',
      ingestRoute({
        service: stub as any,
        maxUploadBytes: 1024,
        maxConcurrentUploadBytes: 1024, // only one in-flight upload of full size
      }),
    );

    // Fire the first request but DO NOT drain its body — the SSE stream
    // stays open, the reservation stays held.
    const inFlight = await app.request('/api/ingest/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '1024' },
      body: JSON.stringify({ title: 'a', content: 'x'.repeat(900) }),
    });
    expect(inFlight.status).toBe(200);

    // Second request would push us to 2048 in-flight against a 1024 cap.
    const blocked = await app.request('/api/ingest/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '1024' },
      body: JSON.stringify({ title: 'b', content: 'y'.repeat(900) }),
    });
    expect(blocked.status).toBe(503);
    const body = (await blocked.json()) as { code: string };
    expect(body.code).toBe('CONCURRENT_UPLOAD_LIMIT');

    // Drain the in-flight stream so the finally block releases the
    // reservation; counter returns to 0.
    await inFlight.text();
    expect(__inflightUploadBytesForTest()).toBe(0);
  });
});

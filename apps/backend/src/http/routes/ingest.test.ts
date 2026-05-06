import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { ingestRoute } from './ingest.js';
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
  it('POST /api/ingest/text streams ingest events as SSE', async () => {
    const stub = new StubService();
    const app = new Hono();
    app.route('/', ingestRoute({ service: stub as any }));
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
    app.route('/', ingestRoute({ service: stub as any }));
    const res = await app.request('/api/ingest/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '', content: 'hello' }),
    });
    expect(res.status).toBe(400);
  });
});

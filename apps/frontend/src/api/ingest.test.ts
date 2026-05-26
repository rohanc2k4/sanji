import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ingestText } from './ingest.js';
import type { IngestEvent } from '@sanji/shared';

function makeSseResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
}

let originalFetch: typeof fetch;
beforeEach(() => {
  originalFetch = global.fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

describe('ingestText', () => {
  it('parses SSE events into IngestEvent stream', async () => {
    global.fetch = (async () =>
      makeSseResponse([
        'event: ingest\ndata: {"kind":"queued","fileId":"a","sourceName":"x"}\n\n',
        'event: ingest\ndata: {"kind":"done","fileId":"a","sourceName":"x","outputPath":"inbox/x.md","tokensInput":1,"tokensOutput":1}\n\n',
      ])) as typeof fetch;

    const events: IngestEvent[] = [];
    for await (const ev of ingestText({ title: 'x', content: 'y' })) {
      events.push(ev);
    }
    expect(events.map((e) => e.kind)).toEqual(['queued', 'done']);
  });
});

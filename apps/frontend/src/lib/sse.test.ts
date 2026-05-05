import { describe, expect, it } from 'vitest';
import { readSseStream } from './sse.js';

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

describe('readSseStream', () => {
  it('parses ordered events from a synthetic SSE body', async () => {
    const res = makeSseResponse([
      'event: text_delta\ndata: {"type":"text_delta","text":"hi"}\n\n',
      'event: text_delta\ndata: {"type":"text_delta","text":" there"}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]);
    const collected: Array<{ type: string }> = [];
    for await (const ev of readSseStream<{ type: string }>(res)) {
      collected.push(ev);
    }
    expect(collected.map((e) => e.type)).toEqual(['text_delta', 'text_delta', 'message_stop']);
  });

  it('ignores malformed JSON in data lines', async () => {
    const res = makeSseResponse([
      'event: ok\ndata: {"type":"ok"}\n\n',
      'event: bad\ndata: not-json\n\n',
      'event: ok\ndata: {"type":"ok2"}\n\n',
    ]);
    const collected: Array<{ type: string }> = [];
    for await (const ev of readSseStream<{ type: string }>(res)) {
      collected.push(ev);
    }
    expect(collected.map((e) => e.type)).toEqual(['ok', 'ok2']);
  });
});

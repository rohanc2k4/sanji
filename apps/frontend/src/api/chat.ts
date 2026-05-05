import type { ChatEvent, ChatRequest, IndexingStatusEvent } from '@sanji/shared';
import { readSseStream } from '../lib/sse.js';

export async function* chatStream(
  req: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent, void, void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) throw new Error(`chat: HTTP ${res.status}`);
  yield* readSseStream<ChatEvent>(res, { signal });
}

export async function* indexingStream(
  signal?: AbortSignal,
): AsyncGenerator<IndexingStatusEvent, void, void> {
  const res = await fetch('/api/indexing/status', { signal });
  if (!res.ok) throw new Error(`indexing: HTTP ${res.status}`);
  yield* readSseStream<IndexingStatusEvent>(res, { signal });
}

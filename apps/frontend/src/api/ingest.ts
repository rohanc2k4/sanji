import type { IngestEvent, IngestTextRequest } from '@sanji/shared';
import { readSseStream } from '../lib/sse.js';

export async function* ingestText(
  req: IngestTextRequest,
  signal?: AbortSignal,
): AsyncGenerator<IngestEvent, void, void> {
  const res = await fetch('/api/ingest/text', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) throw new Error(`ingest/text: HTTP ${res.status}`);
  yield* readSseStream<IngestEvent>(res, { signal });
}

export async function* ingestFile(
  file: File,
  signal?: AbortSignal,
): AsyncGenerator<IngestEvent, void, void> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/ingest/file', {
    method: 'POST',
    body: fd,
    signal,
  });
  if (!res.ok) throw new Error(`ingest/file: HTTP ${res.status}`);
  yield* readSseStream<IngestEvent>(res, { signal });
}

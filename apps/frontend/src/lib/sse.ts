export async function* readSseStream<T>(
  res: Response,
  { signal }: { signal?: AbortSignal } = {},
): AsyncGenerator<T, void, void> {
  if (!res.body) throw new Error('no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const { createParser } = await import('eventsource-parser');
  const queue: T[] = [];
  let streamDone = false;
  let resolveNext: (() => void) | null = null;
  const wake = () => {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r();
    }
  };
  const parser = createParser({
    onEvent: (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as T;
        queue.push(parsed);
        wake();
      } catch {
        /* ignore malformed JSON */
      }
    },
  });
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        parser.feed(decoder.decode(value, { stream: true }));
        if (signal?.aborted) {
          reader.cancel();
          return;
        }
      }
    } finally {
      streamDone = true;
      wake();
    }
  })();
  while (true) {
    if (queue.length) {
      yield queue.shift()!;
      continue;
    }
    if (streamDone) return;
    await new Promise<void>((r) => {
      resolveNext = r;
    });
  }
}

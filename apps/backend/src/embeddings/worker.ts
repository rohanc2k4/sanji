import { parentPort } from 'node:worker_threads';
import { pipeline } from '@xenova/transformers';

interface InMessage { id: number; text: string }

if (!parentPort) throw new Error('embeddings/worker.ts must run in a worker_thread');

const MODEL = process.env['SANJI_EMBED_MODEL'] ?? 'Xenova/all-MiniLM-L6-v2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;
const ready: Promise<void> = (async () => {
  extractor = await pipeline('feature-extraction', MODEL);
})();

parentPort.on('message', async (msg: InMessage) => {
  try {
    await ready;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const out = await extractor(msg.text, { pooling: 'mean', normalize: true });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const arr = Array.from(out.data as Float32Array);
    parentPort!.postMessage({ id: msg.id, ok: true, embedding: arr });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    parentPort!.postMessage({ id: msg.id, ok: false, error: message });
  }
});

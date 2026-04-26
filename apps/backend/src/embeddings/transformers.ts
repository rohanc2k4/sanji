import { Worker } from 'node:worker_threads';
import { type Embedder, EMBEDDING_DIM } from './embedder.js';

interface OutMessage {
  id: number;
  ok: boolean;
  embedding?: number[];
  error?: string;
}

const WORKER_URL = new URL('./worker.ts', import.meta.url);

export class TransformersEmbedder implements Embedder {
  private worker: Worker;
  private nextId = 0;
  private pending = new Map<number, { resolve: (v: Float32Array) => void; reject: (e: Error) => void }>();

  constructor() {
    this.worker = new Worker(WORKER_URL, { execArgv: ['--import', 'tsx'] });
    this.worker.on('message', (msg: OutMessage) => {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.ok && msg.embedding) {
        const arr = new Float32Array(msg.embedding);
        if (arr.length !== EMBEDDING_DIM) {
          p.reject(new Error(`expected ${EMBEDDING_DIM}-dim, got ${arr.length}`));
          return;
        }
        p.resolve(arr);
      } else {
        p.reject(new Error(msg.error ?? 'embedding failed'));
      }
    });
    this.worker.on('error', (err) => {
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
    });
  }

  async embed(text: string): Promise<Float32Array> {
    const id = this.nextId++;
    return new Promise<Float32Array>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, text } satisfies { id: number; text: string });
    });
  }

  async close(): Promise<void> {
    await this.worker.terminate();
  }
}

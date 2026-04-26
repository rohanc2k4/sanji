import { createHash } from 'node:crypto';

export const EMBEDDING_DIM = 384;

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
  close(): Promise<void>;
}

/**
 * Deterministic 384-dim embedder for tests. Hashes the text to seed the
 * vector so identical input produces an identical (and unit-norm) output.
 */
export class FakeEmbedder implements Embedder {
  async embed(text: string): Promise<Float32Array> {
    const out = new Float32Array(EMBEDDING_DIM);
    const seed = createHash('sha256').update(text).digest();
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      out[i] = (seed[i % seed.length]! / 255) * 2 - 1;
    }
    let norm = 0;
    for (let i = 0; i < EMBEDDING_DIM; i++) norm += out[i]! * out[i]!;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < EMBEDDING_DIM; i++) out[i]! /= norm;
    return out;
  }
  async close(): Promise<void> {}
}

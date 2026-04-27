import { describe, expect, it } from 'vitest';
import { FakeEmbedder, EMBEDDING_DIM } from './embedder.js';

describe('FakeEmbedder', () => {
  it('returns a deterministic unit-norm vector', async () => {
    const e = new FakeEmbedder();
    const a = await e.embed('hello');
    const b = await e.embed('hello');
    expect(a).toEqual(b);
    expect(a).toHaveLength(EMBEDDING_DIM);
    let norm = 0;
    for (let i = 0; i < EMBEDDING_DIM; i++) norm += a[i]! * a[i]!;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 5);
  });

  it('produces different vectors for different inputs', async () => {
    const e = new FakeEmbedder();
    const a = await e.embed('foo');
    const b = await e.embed('bar');
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

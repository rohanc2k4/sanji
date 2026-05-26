import { describe, it, expect } from 'vitest';
import { rrfFuse } from './rrf.js';

describe('rrfFuse', () => {
  it('fuses two ranked lists with RRF k=60', () => {
    const a = ['x', 'y', 'z']; // ranks 1, 2, 3
    const b = ['z', 'x']; // ranks 1, 2
    const fused = rrfFuse([a, b], { k: 60 });
    expect(fused.map((r) => r.id)).toEqual(['x', 'z', 'y']);
    expect(fused[0]!.score).toBeCloseTo(1 / 61 + 1 / 62, 5);
  });

  it('handles empty input lists', () => {
    expect(rrfFuse([[]], { k: 60 })).toEqual([]);
    expect(rrfFuse([], { k: 60 })).toEqual([]);
  });

  it('treats id matching as exact', () => {
    const fused = rrfFuse([['a:1', 'a:2'], ['a:2']], { k: 60 });
    expect(fused.map((r) => r.id)).toEqual(['a:2', 'a:1']);
  });

  it('a doc ranked highly in both lists scores higher than one ranked highly in only one', () => {
    const a = ['both', 'onlyA'];
    const b = ['both', 'onlyB'];
    const fused = rrfFuse([a, b], { k: 60 });
    expect(fused[0]!.id).toBe('both');
  });
});

import { describe, expect, it } from 'vitest';
import { chunkBody } from './chunk.js';

const PARAGRAPH = 'lorem '.repeat(40).trim();

describe('chunkBody', () => {
  it('returns a single chunk for short text', () => {
    const out = chunkBody('hello world', { sizeTokens: 500, overlapTokens: 50 });
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe('hello world');
    expect(out[0]?.startChar).toBe(0);
    expect(out[0]?.endChar).toBe('hello world'.length);
  });

  it('splits long text into overlapping chunks', () => {
    const big = `${PARAGRAPH}\n\n${PARAGRAPH}\n\n${PARAGRAPH}\n\n${PARAGRAPH}`;
    const out = chunkBody(big, { sizeTokens: 100, overlapTokens: 20 });
    expect(out.length).toBeGreaterThan(1);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].startChar).toBeLessThan(out[i - 1].endChar);
    }
    for (const c of out) expect(c.text.length).toBeGreaterThan(0);
  });

  it('falls back to character slicing when a single paragraph exceeds the size', () => {
    const para = 'x'.repeat(8000);
    const out = chunkBody(para, { sizeTokens: 100, overlapTokens: 10 });
    expect(out.length).toBeGreaterThan(1);
    expect(out[0]?.startChar).toBe(0);
    expect(out.at(-1)?.endChar).toBe(8000);
  });

  it('returns no chunks for an empty body', () => {
    expect(chunkBody('', { sizeTokens: 500, overlapTokens: 50 })).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { chunkBody, formatChunkForEmbedding } from './chunk.js';

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
      const cur = out[i]!;
      const prev = out[i - 1]!;
      expect(cur.startChar).toBeLessThan(prev.endChar);
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

describe('chunkBody header trail', () => {
  it('attaches the active header trail to each chunk', () => {
    const body = [
      '# Top',
      '',
      'top body.',
      '',
      '## Sub',
      '',
      'sub body.',
      '',
      '### Deep',
      '',
      'deep body.',
    ].join('\n');
    const chunks = chunkBody(body, { sizeTokens: 50, overlapTokens: 0 });
    const trails = chunks.map((c) => c.headerTrail);
    expect(trails[0]).toEqual(['Top']);
    expect(trails.find((t) => t.includes('Sub'))).toEqual(['Top', 'Sub']);
    expect(trails.find((t) => t.includes('Deep'))).toEqual(['Top', 'Sub', 'Deep']);
  });

  it('truncates the trail when a sibling or ancestor heading appears', () => {
    const body = [
      '# A',
      'a body.',
      '## A1',
      'a1 body.',
      '## A2',
      'a2 body.',
    ].join('\n');
    const chunks = chunkBody(body, { sizeTokens: 50, overlapTokens: 0 });
    const a2 = chunks.find((c) => c.text.includes('a2 body'));
    expect(a2?.headerTrail).toEqual(['A', 'A2']);
  });
});

describe('formatChunkForEmbedding', () => {
  it('prepends doc title and trail above the chunk body', () => {
    const formatted = formatChunkForEmbedding(
      { text: 'body', headerTrail: ['Top', 'Sub'], chunkIndex: 0, startChar: 0, endChar: 4 } as any,
      { title: 'Doc Title' } as any,
    );
    expect(formatted).toContain('# Doc Title');
    expect(formatted).toContain('## Top');
    expect(formatted).toContain('### Sub');
    expect(formatted).toContain('body');
  });

  it('inserts contextText between the header trail and the chunk body when provided', () => {
    const formatted = formatChunkForEmbedding(
      { text: 'body', headerTrail: ['Top'], chunkIndex: 0, startChar: 0, endChar: 4 } as any,
      { title: 'Doc' } as any,
      { contextText: 'A blurb describing the chunk.' },
    );
    expect(formatted).toContain('# Doc');
    expect(formatted).toContain('## Top');
    expect(formatted).toContain('A blurb describing the chunk.');
    expect(formatted.indexOf('A blurb')).toBeLessThan(formatted.indexOf('body'));
  });

  it('omits contextText cleanly when not provided', () => {
    const formatted = formatChunkForEmbedding(
      { text: 'body', headerTrail: [], chunkIndex: 0, startChar: 0, endChar: 4 } as any,
      { title: 'Doc' } as any,
    );
    expect(formatted).not.toContain('blurb');
    expect(formatted).toContain('body');
  });

  it('handles missing doc title gracefully', () => {
    const formatted = formatChunkForEmbedding(
      { text: 'body', headerTrail: [], chunkIndex: 0, startChar: 0, endChar: 4 } as any,
      { title: null } as any,
    );
    expect(formatted).toContain('body');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { rewriteQuery } from './rewriter.js';

describe('rewriteQuery', () => {
  it('returns 3 paraphrases parsed from LLM output', async () => {
    const llm = vi.fn().mockResolvedValue(
      'how does the bank protocol work\nwire format of ATM messages\nencrypt then mac details',
    );
    const out = await rewriteQuery('wire format in ATM project', { llm });
    expect(out).toHaveLength(3);
    expect(out[0]).toBe('how does the bank protocol work');
    expect(out[2]).toBe('encrypt then mac details');
  });

  it('strips leading numbering or bullets if the model adds them', async () => {
    const llm = vi.fn().mockResolvedValue('1. first\n2) second\n- third');
    const out = await rewriteQuery('q', { llm });
    expect(out).toEqual(['first', 'second', 'third']);
  });

  it('caps at 3 even if the model returns more lines', async () => {
    const llm = vi.fn().mockResolvedValue('a\nb\nc\nd\ne');
    const out = await rewriteQuery('q', { llm });
    expect(out).toEqual(['a', 'b', 'c']);
  });

  it('falls back to empty array on LLM error', async () => {
    const llm = vi.fn().mockRejectedValue(new Error('rate limit'));
    const out = await rewriteQuery('q', { llm });
    expect(out).toEqual([]);
  });

  it('falls back to empty array on empty LLM output', async () => {
    const llm = vi.fn().mockResolvedValue('');
    const out = await rewriteQuery('q', { llm });
    expect(out).toEqual([]);
  });
});

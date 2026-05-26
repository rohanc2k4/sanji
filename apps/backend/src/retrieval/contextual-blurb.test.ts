import { describe, it, expect, vi } from 'vitest';
import { generateContextBlurb } from './contextual-blurb.js';

describe('generateContextBlurb', () => {
  it('calls the LLM with the parent doc cached and the chunk inline', async () => {
    const llm = vi.fn().mockResolvedValue('A short context blurb describing this chunk.');
    const blurb = await generateContextBlurb(
      {
        docTitle: 'CMSC 414 ATM',
        docBody: '...long body...',
        chunkText: 'short chunk',
        headerTrail: ['Crypto'],
      },
      { llm },
    );
    expect(blurb).toBe('A short context blurb describing this chunk.');
    expect(llm).toHaveBeenCalledOnce();
    const callArg = llm.mock.calls[0]![0]!;
    expect(callArg.system).toMatch(/concise context/i);
    expect(callArg.docBody).toContain('long body');
    expect(callArg.docBody).toContain('CMSC 414 ATM');
    expect(callArg.docBody).toContain('Crypto');
    expect(callArg.chunk).toBe('short chunk');
    expect(callArg.cacheParent).toBe(true);
  });

  it('truncates blurbs longer than ~120 words', async () => {
    const longText = 'word '.repeat(200);
    const llm = vi.fn().mockResolvedValue(longText);
    const blurb = await generateContextBlurb(
      { docTitle: 't', docBody: 'b', chunkText: 'c', headerTrail: [] },
      { llm },
    );
    expect(blurb.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(120);
  });

  it('renders an empty header trail as "(top)"', async () => {
    const llm = vi.fn().mockResolvedValue('blurb');
    await generateContextBlurb(
      { docTitle: 't', docBody: 'b', chunkText: 'c', headerTrail: [] },
      { llm },
    );
    expect(llm.mock.calls[0]![0]!.docBody).toContain('Section: (top)');
  });
});

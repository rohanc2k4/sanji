import { describe, expect, it } from 'vitest';
import { extract } from './paste.js';

describe('paste extractor', () => {
  it('passes string through with line endings normalized to \\n', async () => {
    const r = await extract('hello\r\nworld\r\nfoo', 'pasted');
    expect(r.text).toBe('hello\nworld\nfoo');
    expect(r.warnings).toEqual([]);
  });

  it('handles Buffer input by decoding as utf-8', async () => {
    const buf = Buffer.from('hello\nworld', 'utf-8');
    const r = await extract(buf, 'pasted');
    expect(r.text).toBe('hello\nworld');
  });

  it('returns empty text + warning on empty input', async () => {
    const r = await extract('', 'pasted');
    expect(r.text).toBe('');
    expect(r.warnings).toContain('paste content was empty');
  });
});

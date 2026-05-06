import { describe, expect, it } from 'vitest';
import { extract } from './txt.js';

describe('txt extractor', () => {
  it('reads UTF-8 bytes and normalizes line endings', async () => {
    const buf = Buffer.from('first line\r\nsecond line\nthird', 'utf-8');
    const r = await extract(buf, 'notes.txt');
    expect(r.text).toBe('first line\nsecond line\nthird');
    expect(r.warnings).toEqual([]);
  });

  it('handles UTF-8 BOM gracefully', async () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('hello', 'utf-8')]);
    const r = await extract(buf, 'bom.txt');
    expect(r.text).toBe('hello');
  });

  it('warns on empty file', async () => {
    const r = await extract(Buffer.alloc(0), 'empty.txt');
    expect(r.text).toBe('');
    expect(r.warnings).toContain('txt file was empty');
  });
});

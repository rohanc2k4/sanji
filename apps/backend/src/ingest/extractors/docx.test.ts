import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './docx.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '../../tests/fixtures');

describe('docx extractor', () => {
  it('extracts prose from a small docx', async () => {
    const buf = readFileSync(join(FIXTURES, 'sample.docx'));
    const r = await extract(buf, 'sample.docx');
    expect(r.text.length).toBeGreaterThan(0);
    // Soft assertion — mammoth.extractRawText returns the prose; exact format
    // may vary (table cells get newline-separated). At minimum the marker
    // strings should appear.
    expect(r.text.toLowerCase()).toContain('sample docx fixture');
    expect(r.text.toLowerCase()).toContain('hello world');
    expect(r.warnings).toEqual([]);
  });

  it('returns empty + warning on non-docx bytes', async () => {
    const r = await extract(Buffer.from('not a docx'), 'fake.docx');
    expect(r.text).toBe('');
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

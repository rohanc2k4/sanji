import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './pdf.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '../../tests/fixtures');

describe('pdf extractor', () => {
  it('extracts text from a 2-page text PDF', async () => {
    const buf = readFileSync(join(FIXTURES, 'sample.pdf'));
    const r = await extract(buf, 'sample.pdf');
    expect(r.text.toLowerCase()).toContain('sample fixture');
    expect(r.text.toLowerCase()).toContain('hello world');
    expect(r.pages).toBe(2);
    expect(r.warnings).toEqual([]);
  });

  it('returns empty text + scanned warning when PDF has no text layer', async () => {
    // Note: this fixture is structurally an empty-text-layer PDF. From the
    // extractor's perspective it is identical to a scanned PDF (zero
    // extractable text characters), so it exercises the same code path.
    const buf = readFileSync(join(FIXTURES, 'scanned.pdf'));
    const r = await extract(buf, 'scanned.pdf');
    expect(r.text.trim()).toBe('');
    expect(r.warnings.some((w) => w.toLowerCase().includes('scanned'))).toBe(true);
  });

  it('returns empty text + warning on corrupted bytes', async () => {
    const buf = Buffer.from('not a pdf at all');
    const r = await extract(buf, 'corrupt.pdf');
    expect(r.text).toBe('');
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

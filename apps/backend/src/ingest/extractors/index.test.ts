import { describe, expect, it } from 'vitest';
import { detectFormat, extractByFormat } from './index.js';

describe('detectFormat', () => {
  it.each([
    ['paper.pdf', 'pdf'],
    ['paper.PDF', 'pdf'],
    ['notes.docx', 'docx'],
    ['notes.txt', 'txt'],
    ['notes.md', 'txt'],
    ['notes', 'txt'],
  ] as const)('detects %s as %s', (filename, expected) => {
    expect(detectFormat(filename)).toBe(expected);
  });
});

describe('extractByFormat', () => {
  it('routes paste through the paste extractor', async () => {
    const r = await extractByFormat('paste', 'hello world', 'pasted');
    expect(r.text).toBe('hello world');
  });

  it('routes txt buffers through the txt extractor', async () => {
    const r = await extractByFormat('txt', Buffer.from('line\nline2', 'utf-8'), 'notes.txt');
    expect(r.text).toBe('line\nline2');
  });
});

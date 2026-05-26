import { describe, expect, it } from 'vitest';
import { parseNote } from './parse.js';

describe('parseNote', () => {
  it('extracts frontmatter, body, and a single wikilink', () => {
    const src = `---\ntitle: Test\ntype: note\n---\n\nHello [[foo]] world.\n`;
    const out = parseNote('test.md', src, 1234);
    expect(out.note.frontmatter).toEqual({ title: 'Test', type: 'note' });
    expect(out.note.title).toBe('Test');
    expect(out.note.body.trim()).toBe('Hello [[foo]] world.');
    expect(out.note.mtimeMs).toBe(1234);
    expect(out.wikilinks).toEqual([{ sourcePath: 'test.md', targetSlug: 'foo', occurrenceCount: 1 }]);
  });

  it('handles missing frontmatter and uses H1 as title', () => {
    const out = parseNote('p.md', '# Hello\n\nWorld.\n', 1);
    expect(out.note.frontmatter).toBeNull();
    expect(out.note.title).toBe('Hello');
    expect(out.note.body.trim()).toBe('# Hello\n\nWorld.');
  });

  it('counts repeated wikilinks and supports |alias and #anchor', () => {
    const out = parseNote(
      's.md',
      'See [[foo]], also [[foo|other]] and [[bar#sec|alias]] and [[foo]].',
      1,
    );
    const map = new Map(out.wikilinks.map((w) => [w.targetSlug, w.occurrenceCount]));
    expect(map.get('foo')).toBe(3);
    expect(map.get('bar')).toBe(1);
  });

  it('returns no title and empty wikilinks for an empty file', () => {
    const out = parseNote('e.md', '', 1);
    expect(out.note.title).toBeNull();
    expect(out.wikilinks).toEqual([]);
  });

  it('recovers when an unquoted title contains a colon (auto-quote retry)', () => {
    const src = `---\ntitle: SVD: Subspaces, Rank, and Determinant\ntype: problem\n---\n\nBody.\n`;
    const out = parseNote('p.md', src, 1);
    expect(out.note.title).toBe('SVD: Subspaces, Rank, and Determinant');
    expect(out.note.frontmatter).toMatchObject({ type: 'problem' });
    expect(out.note.body.trim()).toBe('Body.');
  });

  it('falls back to body-only when frontmatter is unrecoverable', () => {
    // A truly malformed frontmatter that the sanitizer can't fix — make sure
    // we don't crash and we still return the note with a parseable body.
    const src = `---\n: : :\n---\n\n# Title\n\nBody.\n`;
    const out = parseNote('p.md', src, 1);
    // Either frontmatter is null or the sanitizer salvages something; either is fine.
    // The hard requirement is no throw and body is recoverable.
    expect(out.note.body).toContain('Body');
  });
});

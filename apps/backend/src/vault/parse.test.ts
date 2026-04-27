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
});

import { describe, expect, it } from 'vitest';
import { splitLatexText, remarkLatexDelimiters } from './remarkLatexDelimiters';

describe('splitLatexText', () => {
  it('converts \\(...\\) into an inlineMath node', () => {
    expect(splitLatexText('a \\(x^2\\) b')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'inlineMath', value: 'x^2' },
      { type: 'text', value: ' b' },
    ]);
  });

  it('converts \\[...\\] into a (display) math node', () => {
    expect(splitLatexText('\\[E=mc^2\\]')).toEqual([{ type: 'math', value: 'E=mc^2' }]);
  });

  it('returns a single text node when there is no LaTeX', () => {
    expect(splitLatexText('plain words')).toEqual([{ type: 'text', value: 'plain words' }]);
  });

  it('handles multiple expressions in one string', () => {
    expect(splitLatexText('\\(a\\) and \\(b\\)')).toEqual([
      { type: 'inlineMath', value: 'a' },
      { type: 'text', value: ' and ' },
      { type: 'inlineMath', value: 'b' },
    ]);
  });
});

describe('remarkLatexDelimiters', () => {
  it('rewrites text nodes but leaves inlineCode and code nodes untouched', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'use \\(a\\) here ' },
            { type: 'inlineCode', value: 'f\\(x\\)' },
          ],
        },
        { type: 'code', lang: 'js', value: 'const r = /\\(/;' },
      ],
    };
    remarkLatexDelimiters()(tree);

    const para = tree.children[0]!;
    expect(para.children).toEqual([
      { type: 'text', value: 'use ' },
      { type: 'inlineMath', value: 'a' },
      { type: 'text', value: ' here ' },
      { type: 'inlineCode', value: 'f\\(x\\)' }, // inline code: untouched
    ]);
    // fenced code block: untouched
    expect(tree.children[1]!.value).toBe('const r = /\\(/;');
  });
});

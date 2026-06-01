import { describe, expect, it } from 'vitest';
import { normalizeMath } from './normalizeMath';

describe('normalizeMath', () => {
  it('converts inline \\(...\\) to $...$', () => {
    expect(normalizeMath('the gradient \\(\\nabla f\\) is zero')).toBe(
      'the gradient $\\nabla f$ is zero',
    );
  });

  it('converts display \\[...\\] to $$...$$', () => {
    expect(normalizeMath('display: \\[x^2 + y^2\\] done')).toBe('display: $$x^2 + y^2$$ done');
  });

  it('leaves existing $...$ and $$...$$ untouched', () => {
    expect(normalizeMath('inline $a+b$ and $$c+d$$ here')).toBe('inline $a+b$ and $$c+d$$ here');
  });

  it('does not rewrite delimiters inside fenced code blocks', () => {
    const src = 'before \\(a\\)\n```js\nconst x = f\\(y\\);\n```\nafter \\(z\\)';
    expect(normalizeMath(src)).toBe('before $a$\n```js\nconst x = f\\(y\\);\n```\nafter $z$');
  });

  it('handles multiple expressions and multiline display math', () => {
    expect(normalizeMath('\\(p\\) then \\[\n\\sum_i x_i\n\\]')).toBe('$p$ then $$\n\\sum_i x_i\n$$');
  });

  it('is a no-op on plain prose', () => {
    expect(normalizeMath('just words, no math')).toBe('just words, no math');
  });
});

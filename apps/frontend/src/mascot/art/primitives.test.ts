import { describe, expect, it } from 'vitest';
import { ellF, poly, rr, ln } from './primitives';
import { makeSpyCtx } from './spy-context';

describe('primitives', () => {
  it('ellF fills an ellipse with the given color', () => {
    const g = makeSpyCtx();
    ellF(g, 10, 10, 5, 4, '#abcdef');
    expect(g.fillStyle).toBe('#abcdef');
    expect(g.__calls.has('ellipse')).toBe(true);
    expect(g.__calls.has('fill')).toBe(true);
  });

  it('ellF clamps tiny radii so it never throws on zero', () => {
    const g = makeSpyCtx();
    expect(() => ellF(g, 0, 0, 0, 0, '#000000')).not.toThrow();
  });

  it('poly traces and fills a polygon', () => {
    const g = makeSpyCtx();
    poly(g, [[0, 0], [4, 0], [2, 4]], '#112233');
    expect(g.fillStyle).toBe('#112233');
    expect(g.__calls.has('moveTo')).toBe(true);
    expect(g.__calls.has('lineTo')).toBe(true);
    expect(g.__calls.has('fill')).toBe(true);
  });

  it('rr fills a rounded rect', () => {
    const g = makeSpyCtx();
    rr(g, 1, 2, 10, 8, 3, '#445566');
    expect(g.fillStyle).toBe('#445566');
    expect(g.__calls.has('roundRect')).toBe(true);
    expect(g.__calls.has('fill')).toBe(true);
  });

  it('ln strokes a line with color and width', () => {
    const g = makeSpyCtx();
    ln(g, 0, 0, 5, 5, '#778899', 2);
    expect(g.strokeStyle).toBe('#778899');
    expect(g.lineWidth).toBe(2);
    expect(g.__calls.has('stroke')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { drawFlightSprite } from './flight';
import { makeSpyCtx } from './spy-context';

describe('drawFlightSprite', () => {
  it('draws the winged side-profile sprite without throwing', () => {
    const g = makeSpyCtx();
    expect(() => drawFlightSprite(g, { flap: 0 })).not.toThrow();
    expect(g.__calls.has('fill')).toBe(true);
    expect(g.__calls.has('stroke')).toBe(true);
  });

  it('handles the full flap range', () => {
    for (const flap of [-1, -0.5, 0, 0.5, 1]) {
      const g = makeSpyCtx();
      expect(() => drawFlightSprite(g, { flap })).not.toThrow();
    }
  });

  it('clips the head highlight (save/clip/restore)', () => {
    const g = makeSpyCtx();
    drawFlightSprite(g, { flap: 0.3 });
    expect(g.__calls.has('clip')).toBe(true);
    expect(g.__calls.has('save')).toBe(true);
    expect(g.__calls.has('restore')).toBe(true);
  });
});

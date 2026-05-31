import { describe, expect, it } from 'vitest';
import { drawFront, type FrontMotion } from './front';
import { makeSpyCtx } from './spy-context';

const restMotion: FrontMotion = {
  bob: 0, swayScale: 1, tilt: 0, lick: 0, headDip: 0, pawReach: 0, groomPaw: false,
};

describe('drawFront', () => {
  it('draws the body, tail, and head without throwing', () => {
    const g = makeSpyCtx();
    expect(() =>
      drawFront(g, { eye: 'open', mouth: 'w', droop: 0, blink: false, t: 0, motion: restMotion }),
    ).not.toThrow();
    expect(g.__calls.has('fill')).toBe(true);
    expect(g.__calls.has('stroke')).toBe(true);
  });

  it('wraps drawing in save/restore so the bob translate stays local', () => {
    const g = makeSpyCtx();
    drawFront(g, { eye: 'open', mouth: 'w', droop: 0, blink: false, t: 1, motion: { ...restMotion, bob: 3 } });
    expect(g.__calls.has('save')).toBe(true);
    expect(g.__calls.has('restore')).toBe(true);
    expect(g.__calls.has('translate')).toBe(true);
  });

  it('renders the raised grooming paw when groomPaw is set', () => {
    const g = makeSpyCtx();
    expect(() =>
      drawFront(g, {
        eye: 'half', mouth: 'tongue', droop: 0.1, blink: false, t: 0.5,
        motion: { ...restMotion, groomPaw: true, lick: 1 },
      }),
    ).not.toThrow();
    expect(g.__calls.has('roundRect')).toBe(true);
  });

  it('passes a non-zero tilt through to the head (head rotates)', () => {
    const g = makeSpyCtx();
    drawFront(g, { eye: 'open', mouth: 'w', droop: -0.1, blink: false, t: 0, motion: { ...restMotion, tilt: 0.15 } });
    expect(g.__calls.has('rotate')).toBe(true);
  });
});

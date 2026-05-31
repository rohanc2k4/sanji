import { describe, expect, it } from 'vitest';
import { drawHead, eyeAt, mouthAt, type EyeMode, type MouthMode } from './head';
import { makeSpyCtx } from './spy-context';

const eyes: EyeMode[] = ['open', 'closed', 'wide', 'half', 'worried'];
const mouths: MouthMode[] = ['none', 'w', 'smile', 'tongue', 'frown'];

describe('drawHead', () => {
  it('renders every eye mode without throwing', () => {
    for (const eye of eyes) {
      const g = makeSpyCtx();
      expect(() => drawHead(g, { cx: 32, cy: 25, scale: 1, eye, mouth: 'w', droop: 0 })).not.toThrow();
      expect(g.__calls.has('fill')).toBe(true);
    }
  });

  it('renders every mouth mode without throwing', () => {
    for (const mouth of mouths) {
      const g = makeSpyCtx();
      expect(() => drawHead(g, { cx: 32, cy: 25, scale: 1, eye: 'open', mouth, droop: 0 })).not.toThrow();
    }
  });

  it('blink overrides the eye to a closed line', () => {
    const g = makeSpyCtx();
    expect(() =>
      drawHead(g, { cx: 32, cy: 25, scale: 1, eye: 'open', mouth: 'w', droop: 0, blink: true }),
    ).not.toThrow();
    expect(g.__calls.has('quadraticCurveTo')).toBe(true);
  });

  it('a non-zero tilt rotates around the neck', () => {
    const g = makeSpyCtx();
    drawHead(g, { cx: 32, cy: 25, scale: 1, eye: 'open', mouth: 'w', droop: 0, tilt: 0.12 });
    expect(g.__calls.has('rotate')).toBe(true);
    expect(g.__calls.has('save')).toBe(true);
    expect(g.__calls.has('restore')).toBe(true);
  });

  it('lick extends the tongue without throwing', () => {
    const g = makeSpyCtx();
    expect(() =>
      drawHead(g, { cx: 32, cy: 25, scale: 1, eye: 'half', mouth: 'tongue', droop: 0.1, lick: 1 }),
    ).not.toThrow();
  });

  it('worried eyes draw brows when not blinking', () => {
    const g = makeSpyCtx();
    drawHead(g, { cx: 32, cy: 25, scale: 1, eye: 'worried', mouth: 'frown', droop: 0.9 });
    expect(g.__calls.has('stroke')).toBe(true);
  });
});

describe('eyeAt / mouthAt', () => {
  it('eyeAt handles all modes', () => {
    for (const eye of eyes) {
      const g = makeSpyCtx();
      expect(() => eyeAt(g, 24, 24, eye, false, 1)).not.toThrow();
    }
  });

  it('mouthAt handles all modes', () => {
    for (const mouth of mouths) {
      const g = makeSpyCtx();
      expect(() => mouthAt(g, 32, 34, mouth, 1, 0)).not.toThrow();
    }
  });
});

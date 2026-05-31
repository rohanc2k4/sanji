import { describe, expect, it } from 'vitest';
import {
  newPass, stepBand, advancePass, isOffscreen, sampleFlight, trailStep, scheduleBubble, initBubble,
  TRAIL_DECAY_MS, BUBBLE_LIFE_MS, type Pass, type Dims, type TrailPoint, type BubbleState,
} from './flightModel';

const DIMS: Dims = { width: 800, height: 600 };
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('stepBand', () => {
  it('indexing spans below the vertical center; other steps stay in the upper band', () => {
    const [, idxBottom] = stepBand('indexing', DIMS);
    const [, vaultBottom] = stepBand('vault', DIMS);
    expect(idxBottom).toBeGreaterThan(DIMS.height / 2);
    expect(vaultBottom).toBeLessThan(DIMS.height / 2);
  });
});

describe('newPass', () => {
  it('never repeats the previous entry edge', () => {
    const prev: Pass = { side: 'L', x: 0, y: 0, vx: 1, vy: 0, lane: 100, ph: 0 };
    for (const r of [0, 0.34, 0.67, 0.99]) {
      const p = newPass(prev, 'vault', DIMS, seq([r, 0.5, 0.5]));
      expect(p.side).not.toBe('L');
    }
  });

  it('places the lane inside the step band', () => {
    const [bt, bb] = stepBand('vault', DIMS);
    const p = newPass(null, 'vault', DIMS, seq([0, 0.5, 0.5]));
    expect(p.lane).toBeGreaterThanOrEqual(bt);
    expect(p.lane).toBeLessThanOrEqual(bb);
  });

  it('a left entry starts off the left edge moving right', () => {
    // prev side 'T' -> choices ['L','R']; rng 0 -> 'L'
    const left = newPass(
      { side: 'T', x: 0, y: 0, vx: 0, vy: 1, lane: 0, ph: 0 }, 'indexing', DIMS, seq([0, 0.5, 0.5]),
    );
    expect(left.side).toBe('L');
    expect(left.x).toBeLessThan(0);
    expect(left.vx).toBeGreaterThan(0);
  });
});

describe('advancePass + isOffscreen', () => {
  it('carries a left-entering pass rightward until it exits', () => {
    let p = newPass({ side: 'R', x: 0, y: 0, vx: 0, vy: 0, lane: 200, ph: 0 }, 'indexing', DIMS, seq([0, 0.5, 0.5]));
    expect(p.side).toBe('L');
    let steps = 0;
    while (!isOffscreen(p, DIMS) && steps < 2000) {
      p = advancePass(p, 0.016, 1, DIMS);
      steps++;
    }
    expect(isOffscreen(p, DIMS)).toBe(true);
  });
});

describe('sampleFlight', () => {
  it('faces left travelling left and right travelling right', () => {
    const right: Pass = { side: 'L', x: 10, y: 10, vx: 135, vy: 0, lane: 10, ph: 0 };
    const left: Pass = { side: 'R', x: 10, y: 10, vx: -135, vy: 0, lane: 10, ph: 0 };
    expect(sampleFlight(right, 0, 0).faceLeft).toBe(false);
    expect(sampleFlight(left, 0, 0).faceLeft).toBe(true);
  });
});

describe('trailStep', () => {
  it('drops points older than the decay window and keeps fresh ones', () => {
    const stale: TrailPoint = { x: 0, y: 0, vx: 0, vy: 0, size: 2, col: '#ffffff', bornMs: 0 };
    const out = trailStep([stale], 100, 100, TRAIL_DECAY_MS + 50, 0.016, seq([0.5]));
    expect(out.some((p) => p.bornMs === 0)).toBe(false);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((p) => p.bornMs === TRAIL_DECAY_MS + 50)).toBe(true);
  });
});

describe('scheduleBubble', () => {
  it('shows one bubble, holds it for its life, then enforces a cooldown', () => {
    let s: BubbleState = initBubble(0);
    s = scheduleBubble(s, 1500, true, ['weeee!'], seq([0]));
    expect(s.text).toBe('weeee!');
    const bornMs = s.bornMs;

    s = scheduleBubble(s, bornMs + 1000, true, ['weeee!'], seq([0]));
    expect(s.text).toBe('weeee!');
    expect(s.bornMs).toBe(bornMs);

    s = scheduleBubble(s, bornMs + BUBBLE_LIFE_MS, true, ['weeee!'], seq([0]));
    expect(s.text).toBeNull();
    expect(s.nextAtMs).toBeGreaterThan(bornMs + BUBBLE_LIFE_MS);

    const stillCooling = scheduleBubble(s, s.nextAtMs - 1, true, ['weeee!'], seq([0]));
    expect(stillCooling.text).toBeNull();
  });

  it('does not start a bubble when canShow is false', () => {
    const s: BubbleState = { text: null, bornMs: 0, nextAtMs: 0 };
    expect(scheduleBubble(s, 100, false, ['hi'], seq([0])).text).toBeNull();
  });
});

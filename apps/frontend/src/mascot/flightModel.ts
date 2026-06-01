import { palette } from './art/palette';

export type Side = 'L' | 'R' | 'T';

export interface Dims {
  width: number;
  height: number;
}

export interface Pass {
  side: Side;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lane: number;
  ph: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  col: string;
  bornMs: number;
}

export interface BubbleState {
  text: string | null;
  bornMs: number;
  nextAtMs: number;
}

export const SPEED = 270;        // px/s cruise (2x — snappier onboarding flight, per smoke)
export const OVER = 80;          // off-screen margin for entry/exit
export const FLOAT_AMP = 30;     // vertical wobble amplitude on L/R passes
export const FLAP_HZ = 4;        // wing flaps per second
export const TRAIL_DECAY_MS = 1000;
export const BUBBLE_LIFE_MS = 2800;
export const COOLDOWN_MIN_MS = 2400;
export const COOLDOWN_SPAN_MS = 2600;
export const TALK_SLOWDOWN = 0.55; // movement multiplier while a bubble is up

const SIDES: Side[] = ['L', 'R', 'T'];
const TRAIL_COLS = [palette.O, palette.H, palette.C, palette.W, palette.WI];

// The vertical band a pass may occupy. During indexing the cat roams the full
// height; on the type-heavy steps it stays in the upper strip, clear of the
// centered form column the user is reading.
export function stepBand(step: string, dims: Dims): [number, number] {
  const roaming = step === 'indexing';
  return roaming
    ? [dims.height * 0.12, dims.height * 0.8]
    : [dims.height * 0.13, dims.height * 0.4];
}

// Start a fresh crossing whose entry edge differs from the previous pass.
export function newPass(prev: Pass | null, step: string, dims: Dims, rng: () => number): Pass {
  const choices = prev ? SIDES.filter((s) => s !== prev.side) : SIDES;
  const side = choices[Math.floor(rng() * choices.length)]!;
  const [bt, bb] = stepBand(step, dims);
  const lane = bt + rng() * (bb - bt);
  const ph = rng() * 6;
  if (side === 'L') return { side, x: -OVER, y: lane, vx: SPEED, vy: 0, lane, ph };
  if (side === 'R') return { side, x: dims.width + OVER, y: lane, vx: -SPEED, vy: 0, lane, ph };
  // top swoop: drift either way horizontally, descend toward the lane
  const dir = rng() < 0.5 ? -1 : 1;
  return {
    side, x: dims.width * (0.2 + rng() * 0.6), y: -OVER,
    vx: dir * SPEED * 0.7, vy: SPEED * 0.7, lane, ph,
  };
}

// Advance a pass by dt seconds. `mul` slows movement while chatter is up.
export function advancePass(pass: Pass, dtSec: number, mul: number, dims: Dims): Pass {
  const x = pass.x + pass.vx * dtSec * mul;
  if (pass.side === 'T') {
    const vy = pass.vy * 0.95;
    let y = pass.y + pass.vy * dtSec * mul;
    y += (pass.lane - y) * 0.025; // ease toward the lane as it levels out
    return { ...pass, x, y, vy };
  }
  const y = pass.lane + Math.sin(x * 0.03 + pass.ph) * FLOAT_AMP;
  return { ...pass, x, y };
}

export function isOffscreen(pass: Pass, dims: Dims): boolean {
  return (
    pass.x > dims.width + OVER + 6 ||
    pass.x < -OVER - 6 ||
    pass.y > dims.height + OVER
  );
}

// Render-ready sample: position, travel-derived facing, and the wing flap phase.
export function sampleFlight(pass: Pass, nowMs: number, startMs: number): {
  x: number;
  y: number;
  faceLeft: boolean;
  flap: number;
} {
  const elapsed = (nowMs - startMs) / 1000;
  return {
    x: pass.x,
    y: pass.y,
    faceLeft: pass.vx < 0,
    flap: Math.sin(elapsed * FLAP_HZ * Math.PI),
  };
}

// Drift existing trail points, spawn two fresh sparks at the anchor, and drop
// anything past the decay window.
export function trailStep(
  trail: TrailPoint[], x: number, y: number, nowMs: number, dtSec: number, rng: () => number,
): TrailPoint[] {
  const advanced: TrailPoint[] = trail.map((p) => ({
    ...p,
    x: p.x + p.vx * dtSec,
    y: p.y + p.vy * dtSec,
    vy: p.vy + 18 * dtSec,
  }));
  for (let i = 0; i < 2; i++) {
    advanced.push({
      x: x + (rng() * 6 - 3),
      y: y + (rng() * 6 - 3),
      vx: rng() * 10 + 4,
      vy: rng() * 14 - 2,
      size: rng() * 2 + 1.6,
      col: TRAIL_COLS[Math.floor(rng() * TRAIL_COLS.length)]!,
      bornMs: nowMs,
    });
  }
  return advanced.filter((p) => nowMs - p.bornMs < TRAIL_DECAY_MS);
}

export function initBubble(nowMs: number): BubbleState {
  return { text: null, bornMs: 0, nextAtMs: nowMs + 1400 };
}

// At most one bubble at a time. Clears after BUBBLE_LIFE_MS and sets a cooldown
// before the next can appear. `canShow` lets the caller suppress chatter when
// the sprite is off-edge or otherwise a bad spot for a bubble.
export function scheduleBubble(
  state: BubbleState, nowMs: number, canShow: boolean, texts: string[], rng: () => number,
): BubbleState {
  if (state.text !== null) {
    if (nowMs - state.bornMs >= BUBBLE_LIFE_MS) {
      const cooldown = COOLDOWN_MIN_MS + rng() * COOLDOWN_SPAN_MS;
      return { text: null, bornMs: state.bornMs, nextAtMs: nowMs + cooldown };
    }
    return state;
  }
  if (canShow && texts.length > 0 && nowMs >= state.nextAtMs) {
    const text = texts[Math.floor(rng() * texts.length)]!;
    return { text, bornMs: nowMs, nextAtMs: state.nextAtMs };
  }
  return state;
}

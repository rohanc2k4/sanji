import { palette } from './palette';
import { ellF, rr, ln } from './primitives';
import { drawHead, type EyeMode, type MouthMode } from './head';

const { K, O, S, C } = palette;

// FrontMotion lives here (not in poses.ts) so front.ts has no dependency on
// the pose table. poses.computeMotion produces these per frame.
export interface FrontMotion {
  bob: number;        // whole-body vertical offset
  swayScale: number;  // tail sway multiplier (energetic exaggerates)
  tilt: number;       // head rotation in radians (active head-cock)
  lick: number;       // 0..1 tongue + raised-paw lift (groom)
  headDip: number;    // head lowers during stretch / groom
  pawReach: number;   // front paws reach forward during stretch
  groomPaw: boolean;  // draw the raised grooming paw
}

export interface FrontOpts {
  eye: EyeMode;
  mouth: MouthMode;
  droop: number;
  blink: boolean;
  t: number;          // seconds, for the tail sway
  motion: FrontMotion;
}

// Seated front-facing cat on the 64-unit master grid. Pure: draws into the
// passed context at fixed grid coordinates; the caller upscales. No animation
// math here — it all arrives via `motion`.
export function drawFront(g: CanvasRenderingContext2D, opts: FrontOpts): void {
  const { eye, mouth, droop, blink, t, motion } = opts;
  const { bob, swayScale, tilt, lick, headDip, pawReach, groomPaw } = motion;

  g.save();
  g.translate(0, bob);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  const sway = Math.sin(t * 1.6) * 1.5 * swayScale;

  // tail: dark outline, orange fill, stripe bands; tip sways
  g.strokeStyle = K;
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(42, 50);
  g.quadraticCurveTo(54 + sway, 40, 52 + sway, 30);
  g.quadraticCurveTo(51, 24, 45, 26);
  g.stroke();
  g.strokeStyle = O;
  g.lineWidth = 5.4;
  g.beginPath();
  g.moveTo(42, 50);
  g.quadraticCurveTo(54 + sway, 40, 52 + sway, 30);
  g.quadraticCurveTo(51, 24, 45, 26);
  g.stroke();
  ellF(g, 52 + sway, 38, 1.9, 1.9, S);
  ellF(g, 51.5 + sway, 30, 1.8, 1.8, S);

  // body silhouette + base + chest cream + side stripes
  rr(g, 20, 43, 24, 18, 9.5, K);
  rr(g, 21.3, 44.3, 21.4, 15.4, 8.3, O);
  ellF(g, 32, 49, 7.5, 4.6, C);
  ln(g, 24.5, 52, 24.5, 58, S, 2);
  ln(g, 39.5, 52, 39.5, 58, S, 2);

  // paws: stretch pushes both outward/forward by pawReach; groom keeps the
  // right paw planted and draws the left paw raised toward the muzzle below.
  if (!groomPaw) {
    ellF(g, 26 - pawReach, 60, 4.2, 3.1, C);
    ellF(g, 38 + pawReach, 60, 4.2, 3.1, C);
    ln(g, 26 - pawReach, 57.5, 26 - pawReach, 60.5, S, 0.9);
    ln(g, 38 + pawReach, 57.5, 38 + pawReach, 60.5, S, 0.9);
  } else {
    ellF(g, 26, 60, 4.2, 3.1, C);
    ln(g, 26, 57.5, 26, 60.5, S, 0.9);
  }

  // head: dips by headDip during stretch/groom; tilt, lick, blink pass through
  drawHead(g, {
    cx: 32,
    cy: 25 + headDip,
    scale: 1,
    eye,
    mouth,
    droop,
    blink,
    tilt,
    lick,
  });

  // groom: raised front paw in front of the muzzle, lifting with `lick`
  if (groomPaw) {
    const rise = lick * 4;
    rr(g, 35.5, 32 - rise, 4.6, 13, 2.2, K);
    rr(g, 36.2, 32.6 - rise, 3.2, 11.8, 1.6, O);
    ellF(g, 38, 32.5 - rise, 3, 2.4, C);
  }

  g.restore();
}

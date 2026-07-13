import { palette } from './palette';
import { ellF, poly, ln } from './primitives';

const { K, O, H, S, C, P, G, GD, D, W } = palette;

export type EyeMode = 'open' | 'closed' | 'wide' | 'half' | 'worried';
export type MouthMode = 'none' | 'w' | 'smile' | 'tongue' | 'frown';

export interface HeadOpts {
  cx: number;
  cy: number;
  scale: number;
  eye: EyeMode;
  mouth: MouthMode;
  droop: number;
  tilt?: number;
  blink?: boolean;
  lick?: number;
}

export function eyeAt(
  g: CanvasRenderingContext2D,
  cx: number, cy: number, mode: EyeMode, blink: boolean, s: number,
): void {
  const R = (v: number) => v * s;
  if (blink || mode === 'closed') {
    g.strokeStyle = K;
    g.lineWidth = Math.max(1, R(1.5));
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - R(3.4), cy - R(0.6));
    g.quadraticCurveTo(cx, cy + R(2.4), cx + R(3.4), cy - R(0.6));
    g.stroke();
    return;
  }
  const f = mode === 'wide' ? 1.18 : 1;
  ellF(g, cx, cy, R(5.2 * f), R(6.2 * f), K);
  ellF(g, cx, cy, R(4.2 * f), R(5.2 * f), G);
  ellF(g, cx, cy + R(1), R(2.9 * f), R(3.5 * f), GD);
  ellF(g, cx, cy + R(0.3), R((mode === 'worried' ? 1.5 : 2.0) * f), R((mode === 'worried' ? 2.6 : 3.4) * f), D);
  ellF(g, cx - R(1.4), cy - R(2.2), R(1.2 * f), R(1.5 * f), W);
  ellF(g, cx + R(1.3), cy + R(1.8), R(0.7), R(0.8), W);
  if (mode === 'half') {
    g.fillStyle = O;
    g.fillRect(cx - R(6.5), cy - R(7.5), R(13), R(5));
    g.strokeStyle = K;
    g.lineWidth = Math.max(1, R(1.2));
    g.beginPath();
    g.moveTo(cx - R(5), cy - R(2.4));
    g.lineTo(cx + R(5), cy - R(2.4));
    g.stroke();
  }
}

export function mouthAt(
  g: CanvasRenderingContext2D,
  cx: number, cy: number, mode: MouthMode, s: number, lick = 0,
): void {
  const R = (v: number) => v * s;
  g.strokeStyle = D;
  g.lineWidth = Math.max(0.8, R(0.95));
  g.lineCap = 'round';
  if (mode === 'none') return;
  if (mode === 'w') {
    ln(g, cx, cy, cx, cy + R(1.7), D, Math.max(0.8, R(0.95)));
    g.beginPath();
    g.moveTo(cx, cy + R(1.7));
    g.quadraticCurveTo(cx - R(3), cy + R(3.8), cx - R(4.5), cy + R(2.4));
    g.stroke();
    g.beginPath();
    g.moveTo(cx, cy + R(1.7));
    g.quadraticCurveTo(cx + R(3), cy + R(3.8), cx + R(4.5), cy + R(2.4));
    g.stroke();
  } else if (mode === 'smile') {
    g.fillStyle = D;
    g.beginPath();
    g.moveTo(cx - R(3.6), cy);
    g.quadraticCurveTo(cx, cy + R(5), cx + R(3.6), cy);
    g.closePath();
    g.fill();
    ellF(g, cx, cy + R(2.8), R(1.7), R(1.2), P);
  } else if (mode === 'tongue') {
    // Base tongue, extended downward as `lick` rises (groom flick).
    const ext = lick * 1.6;
    ln(g, cx, cy, cx, cy + R(1.4), D, Math.max(0.8, R(0.95)));
    ellF(g, cx, cy + R(2.6 + ext), R(1.9), R(2.2 + ext * 1.2), P);
    ln(g, cx, cy + R(1.6), cx, cy + R(3.6 + ext * 1.4), D, Math.max(0.7, R(0.7)));
  } else if (mode === 'frown') {
    ln(g, cx, cy, cx, cy + R(1.6), D, Math.max(0.8, R(0.95)));
    g.beginPath();
    g.moveTo(cx - R(3.5), cy + R(3.8));
    g.quadraticCurveTo(cx, cy + R(1.4), cx + R(3.5), cy + R(3.8));
    g.stroke();
  }
}

export function drawHead(g: CanvasRenderingContext2D, opts: HeadOpts): void {
  const { cx, cy, scale: s, eye, mouth, droop } = opts;
  const tilt = opts.tilt ?? 0;
  const blink = opts.blink ?? false;
  const lick = opts.lick ?? 0;

  const tilted = tilt !== 0;
  if (tilted) {
    // Pivot about the neck (just below the head) so the tilt reads as a
    // listening head-cock rather than a slide.
    g.save();
    g.translate(cx, cy + 16 * s);
    g.rotate(tilt);
    g.translate(-cx, -(cy + 16 * s));
  }

  const X = (x: number) => cx + x * s;
  const Y = (y: number) => cy + y * s;
  const R = (v: number) => v * s;
  const dxe = droop * 5 * s;
  const dye = droop * 7 * s;

  // ears (left then right: outline, orange, pink inner)
  poly(g, [[X(-19) - dxe, Y(-24) + dye], [X(-24), Y(-5)], [X(-4), Y(-12)]], K);
  poly(g, [[X(-17.5) - dxe * 0.8, Y(-21) + dye * 0.8], [X(-20), Y(-7.5)], [X(-7), Y(-12)]], O);
  poly(g, [[X(-16.5) - dxe * 0.7, Y(-17.5) + dye * 0.7], [X(-17.5), Y(-10)], [X(-10), Y(-12)]], P);
  poly(g, [[X(19) + dxe, Y(-24) + dye], [X(24), Y(-5)], [X(4), Y(-12)]], K);
  poly(g, [[X(17.5) + dxe * 0.8, Y(-21) + dye * 0.8], [X(20), Y(-7.5)], [X(7), Y(-12)]], O);
  poly(g, [[X(16.5) + dxe * 0.7, Y(-17.5) + dye * 0.7], [X(17.5), Y(-10)], [X(10), Y(-12)]], P);

  // head silhouette + base
  ellF(g, X(0), Y(0), R(19), R(17), K);
  ellF(g, X(0), Y(0), R(17.7), R(15.8), O);

  // clipped top highlight + chin shadow
  g.save();
  g.beginPath();
  g.ellipse(X(0), Y(0), R(17.7), R(15.8), 0, 0, 7);
  g.clip();
  ellF(g, X(-2), Y(-13), R(12), R(5.5), H);
  ellF(g, X(0), Y(14), R(13), R(5), S);
  g.restore();

  // cream muzzle
  ellF(g, X(0), Y(9.5), R(10), R(6.6), C);

  // forehead M + cheek stripes
  g.strokeStyle = S;
  g.lineWidth = Math.max(1, R(1.5));
  g.lineCap = 'round';
  const stripes = [
    [0, -15, 0, -8.5], [-4, -14, -3, -8.5], [4, -14, 3, -8.5],
    [-7.5, -13, -6, -8.5], [7.5, -13, 6, -8.5],
    [-18.5, 0, -14, 1], [-18.5, 4, -14, 4.5], [18.5, 0, 14, 1], [18.5, 4, 14, 4.5],
  ];
  for (const a of stripes) {
    g.beginPath();
    g.moveTo(X(a[0]!), Y(a[1]!));
    g.lineTo(X(a[2]!), Y(a[3]!));
    g.stroke();
  }

  // eyes
  eyeAt(g, X(-8), Y(-1), eye, blink, s);
  eyeAt(g, X(8), Y(-1), eye, blink, s);
  if (eye === 'worried' && !blink) {
    g.strokeStyle = K;
    g.lineWidth = Math.max(1, R(1.4));
    g.beginPath();
    g.moveTo(X(-12), Y(-9));
    g.lineTo(X(-4.5), Y(-11.5));
    g.stroke();
    g.beginPath();
    g.moveTo(X(12), Y(-9));
    g.lineTo(X(4.5), Y(-11.5));
    g.stroke();
  }

  // nose + mouth + whiskers
  poly(g, [[X(-2.5), Y(5.5)], [X(2.5), Y(5.5)], [X(0), Y(8.5)]], P);
  mouthAt(g, X(0), Y(8.7), mouth, s, lick);
  g.strokeStyle = C;
  g.lineWidth = Math.max(0.7, R(0.8));
  const whiskers = [[-9, 8, -22, 5], [-9, 10.5, -22, 10.5], [9, 8, 22, 5], [9, 10.5, 22, 10.5]];
  for (const a of whiskers) {
    g.beginPath();
    g.moveTo(X(a[0]!), Y(a[1]!));
    g.lineTo(X(a[2]!), Y(a[3]!));
    g.stroke();
  }

  if (tilted) g.restore();
}

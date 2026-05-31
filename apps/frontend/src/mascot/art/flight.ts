import { palette } from './palette';
import { ellF, poly, rr, ln } from './primitives';

const { K, O, H, S, C, P, G, GD, D, W, WI, WS } = palette;

export interface FlightOpts {
  flap: number; // -1..1, wing-flap phase; higher spreads the wing wider
}

// One feathered wing from a shoulder point to a tip, with two feather lines.
function wing(
  g: CanvasRenderingContext2D,
  sx: number, sy: number, tipX: number, tipY: number, fillCol: string, outline: boolean,
): void {
  g.fillStyle = fillCol;
  g.beginPath();
  g.moveTo(sx, sy);
  g.quadraticCurveTo((sx + tipX) / 2 - 2, tipY - 6, tipX, tipY);
  g.quadraticCurveTo((sx + tipX) / 2 + 3, tipY + 8, sx + 7, sy + 6);
  g.closePath();
  g.fill();
  if (outline) {
    g.strokeStyle = K;
    g.lineWidth = 1;
    g.stroke();
  }
  g.strokeStyle = WS;
  g.lineWidth = 0.9;
  for (let i = 1; i <= 2; i++) {
    const fx = sx + (tipX - sx) * (i / 3);
    const fy = sy + (tipY - sy) * (i / 3);
    g.beginPath();
    g.moveTo(sx + 2, sy + 2);
    g.lineTo(fx, fy + 2);
    g.stroke();
  }
}

// Side-profile winged cat on the 72x64 master grid, facing right. The caller
// mirrors for leftward travel. `flap` drives the wing spread.
export function drawFlightSprite(g: CanvasRenderingContext2D, opts: FlightOpts): void {
  const { flap } = opts;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const tipY = 7 + 17 * (flap * 0.5 + 0.5);

  // tail
  g.strokeStyle = K; g.lineWidth = 8; g.beginPath();
  g.moveTo(18, 38); g.quadraticCurveTo(4, 40, 5, 26); g.quadraticCurveTo(6, 18, 13, 19); g.stroke();
  g.strokeStyle = O; g.lineWidth = 5.6; g.beginPath();
  g.moveTo(18, 38); g.quadraticCurveTo(4, 40, 5, 26); g.quadraticCurveTo(6, 18, 13, 19); g.stroke();
  ellF(g, 5.5, 33, 2, 2, S); ellF(g, 5, 26, 2, 2, S); ellF(g, 10, 20, 1.9, 1.9, S);

  // wings: back shadow wing then front wing (outlined)
  wing(g, 30, 26, 17, tipY + 3, WS, false);
  wing(g, 33, 25, 15, tipY, WI, true);

  // body + chest + side stripes
  ellF(g, 30, 39, 15, 10.5, K); ellF(g, 30, 39, 13.7, 9.3, O);
  ellF(g, 31, 44, 11, 5, C);
  ln(g, 24, 31, 23, 36, S, 1.7); ln(g, 33, 31, 32, 36, S, 1.7);

  // two legs
  rr(g, 23, 45, 4, 7, 2, K); rr(g, 23.7, 45.4, 2.6, 6.2, 1.5, O); ellF(g, 25, 53, 2.6, 2, C);
  rr(g, 33, 45, 4, 7, 2, K); rr(g, 33.7, 45.4, 2.6, 6.2, 1.5, O); ellF(g, 35, 53, 2.6, 2, C);

  // head silhouette + clipped highlight/shadow
  ellF(g, 49, 28, 13.5, 12.5, K); ellF(g, 49, 28, 12.3, 11.3, O);
  g.save();
  g.beginPath(); g.ellipse(49, 28, 12.3, 11.3, 0, 0, 7); g.clip();
  ellF(g, 47, 20, 9, 4, H); ellF(g, 50, 38, 10, 4, S);
  g.restore();

  // ears (back outline+shadow, front outline+orange+pink inner)
  poly(g, [[40, 18], [37, 4], [50, 15]], K); poly(g, [[41, 16], [39, 7], [48, 15]], S);
  poly(g, [[52, 17], [58, 3], [61, 18]], K); poly(g, [[53, 15], [57, 6], [59, 16]], O);
  poly(g, [[54.5, 14], [57, 8], [58.5, 15]], P);

  // muzzle + nose + mouth
  ellF(g, 57, 32, 7.5, 5.2, C);
  poly(g, [[61.5, 30], [64.5, 31], [61.5, 33]], P);
  g.strokeStyle = D; g.lineWidth = 0.9;
  g.beginPath(); g.moveTo(61.5, 33); g.lineTo(60, 34.5); g.stroke();
  g.beginPath(); g.moveTo(60, 34.5); g.quadraticCurveTo(57, 36, 55.5, 34.8); g.stroke();

  // eye + brow stripes
  ellF(g, 51, 26, 4.2, 5, K); ellF(g, 51, 26, 3.2, 4, G); ellF(g, 51.3, 27, 2.2, 2.8, GD);
  ellF(g, 51.4, 26.3, 1.5, 2.6, D); ellF(g, 50.2, 24.4, 1, 1.2, W);
  ln(g, 46, 16, 46.5, 21, S, 1.4); ln(g, 50, 15.5, 50, 20, S, 1.4);

  // whiskers
  g.strokeStyle = C; g.lineWidth = 0.8;
  ln(g, 57, 31, 70, 28, C, 0.8); ln(g, 57, 33, 70, 34, C, 0.8); ln(g, 57, 34.5, 69, 39, C, 0.8);
}

// Thin canvas primitives shared by every draw function. Each takes the context
// first and never touches global state beyond the style props it sets.

export function ellF(
  g: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number, fill: string,
): void {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(cx, cy, Math.max(0.3, rx), Math.max(0.3, ry), 0, 0, 7);
  g.fill();
}

export function poly(
  g: CanvasRenderingContext2D, pts: number[][], fill: string,
): void {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0]![0]!, pts[0]![1]!);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0]!, pts[i]![1]!);
  g.closePath();
  g.fill();
}

export function rr(
  g: CanvasRenderingContext2D,
  px: number, py: number, w: number, h: number, r: number, fill: string,
): void {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(px, py, w, h, r);
  g.fill();
}

export function ln(
  g: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number, col: string, lw: number,
): void {
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

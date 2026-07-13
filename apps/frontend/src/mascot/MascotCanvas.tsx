import { useEffect, useRef } from 'react';

export interface MascotCanvasProps {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, nowMs: number) => void;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
}

// Shared reduced-motion check, guarded for non-browser test environments.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MascotCanvas({
  width, height, draw, animated = true, className, ariaLabel,
}: MascotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Keep the latest draw closure without restarting the loop every render.
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // jsdom / headless / ancient engines either return null or throw here; both
    // collapse to a no-op so the component never breaks a render or a test.
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    if (!animated || prefersReducedMotion()) {
      drawRef.current(ctx, 0); // single static frame, no loop
      return;
    }

    let raf = 0;
    let stopped = false;
    const loop = (now: number) => {
      if (stopped) return;
      // Pause drawing while the tab is hidden; keep the loop alive to resume.
      if (typeof document === 'undefined' || !document.hidden) {
        drawRef.current(ctx, now);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [width, height, animated]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  );
}

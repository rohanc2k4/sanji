import { useEffect, useRef } from 'react';
import { drawFlightSprite } from '@/mascot/art/flight';
import { drawFront } from '@/mascot/art/front';
import { POSES, computeMotion } from '@/mascot/poses';
import {
  newPass, advancePass, isOffscreen, sampleFlight, trailStep, scheduleBubble, initBubble,
  BUBBLE_LIFE_MS, TALK_SLOWDOWN, type Pass, type TrailPoint, type BubbleState, type Dims,
} from '@/mascot/flightModel';
import { pickOnboardingQuote } from '@/mascot/quotes';
import { MascotCanvas, prefersReducedMotion } from '@/mascot/MascotCanvas';

export interface OnboardingMascotProps {
  // Current onboarding step. Read-only — the overlay never dispatches; it only
  // uses the step to pick the roaming band. Typed as string to stay decoupled
  // from the onboarding reducer.
  step: string;
}

const SPR_W = 72;
const SPR_H = 64;
const DS = 1.75; // sprite display scale

// The full chatter pool, materialized once from the onboarding quote pool.
const CHATTER = Array.from({ length: 10 }, (_, i) => pickOnboardingQuote(i)).filter(Boolean);

export function OnboardingMascot({ step }: OnboardingMascotProps) {
  const reduced = prefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step; // latest step without restarting the loop

  useEffect(() => {
    if (reduced) return; // static fallback; no loop
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const g = ctx;

    const spr = document.createElement('canvas');
    spr.width = SPR_W;
    spr.height = SPR_H;
    const sx = spr.getContext('2d');
    if (!sx) return;

    const dpr = window.devicePixelRatio || 1;
    let dims: Dims = { width: window.innerWidth, height: window.innerHeight };
    const resize = () => {
      dims = { width: window.innerWidth, height: window.innerHeight };
      canvas.width = Math.round(dims.width * dpr);
      canvas.height = Math.round(dims.height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);

    let pass: Pass = newPass(null, stepRef.current, dims, Math.random);
    let trail: TrailPoint[] = [];
    let bub: BubbleState = initBubble(performance.now());
    let startMs = performance.now();
    let last = startMs;
    let raf = 0;
    let stopped = false;

    const frame = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const talking = bub.text !== null && now - bub.bornMs < BUBBLE_LIFE_MS;
      const mul = talking ? TALK_SLOWDOWN : 1;

      pass = advancePass(pass, dt, mul, dims);
      if (isOffscreen(pass, dims)) {
        pass = newPass(pass, stepRef.current, dims, Math.random);
        startMs = now;
      }
      const { x, y, faceLeft, flap } = sampleFlight(pass, now, startMs);

      const canShow = x > 60 && x < dims.width - 60 && y > 30;
      bub = scheduleBubble(bub, now, canShow, CHATTER, Math.random);

      const dir = faceLeft ? -1 : 1;
      trail = trailStep(trail, x - dir * SPR_W * 0.3 * DS, y + 6, now, dt, Math.random);

      sx.clearRect(0, 0, SPR_W, SPR_H);
      drawFlightSprite(sx, { flap });

      g.clearRect(0, 0, dims.width, dims.height);
      for (const p of trail) {
        const a = Math.max(0, 1 - (now - p.bornMs) / 1000);
        g.globalAlpha = a;
        g.fillStyle = p.col;
        const sz = p.size * (0.4 + 0.6 * a);
        g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
      g.save();
      g.translate(x, y);
      if (faceLeft) g.scale(-1, 1);
      g.imageSmoothingEnabled = false;
      g.drawImage(spr, 0, 0, SPR_W, SPR_H, (-SPR_W * DS) / 2, (-SPR_H * DS) / 2, SPR_W * DS, SPR_H * DS);
      g.restore();

      // Move the chatter bubble via direct DOM writes so the loop never
      // triggers a React re-render.
      const el = bubbleRef.current;
      if (el) {
        if (bub.text) {
          el.textContent = bub.text;
          el.style.display = '';
          const below = y - (SPR_H * DS) / 2 - 18 < 40;
          el.style.left = `${x}px`;
          el.style.top = `${below ? y + (SPR_H * DS) / 2 + 14 : y - (SPR_H * DS) / 2 - 14}px`;
        } else {
          el.style.display = 'none';
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  if (reduced) {
    // Static seated cat near the heading instead of flying.
    return (
      <div
        data-testid="onboarding-mascot"
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[6vh] z-20 -translate-x-1/2"
      >
        <MascotCanvas
          width={96}
          height={96}
          animated={false}
          ariaLabel="Sanji"
          draw={(c) => {
            c.clearRect(0, 0, 96, 96);
            c.save();
            c.scale(96 / 64, 96 / 64);
            drawFront(c, {
              eye: POSES.idle.eye,
              mouth: POSES.idle.mouth,
              droop: POSES.idle.droop,
              blink: false,
              t: 0,
              motion: computeMotion(POSES.idle, 0),
            });
            c.restore();
          }}
        />
      </div>
    );
  }

  return (
    <div data-testid="onboarding-mascot" aria-hidden className="pointer-events-none fixed inset-0 z-20">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div
        ref={bubbleRef}
        style={{ display: 'none', position: 'absolute', transform: 'translate(-50%, -50%)' }}
        className="whitespace-nowrap rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-md"
      />
    </div>
  );
}

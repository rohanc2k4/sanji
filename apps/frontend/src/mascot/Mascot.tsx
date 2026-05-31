import { useEffect, useMemo, useRef, useState } from 'react';
import { pickQuote } from './quotes';
import { useMascotState, type MascotInputs } from './useMascotState';
import { MascotCanvas } from './MascotCanvas';
import { drawFront } from './art/front';
import { POSES, poseNameFor, computeMotion } from './poses';
import { initCycler, advanceCycler, type CyclerState } from './idleCycler';

export type MascotMode = 'chatty' | 'quiet' | 'off';

export interface MascotProps {
  mode?: MascotMode;
  chatStreaming: boolean;
  lastError: MascotInputs['lastError'];
}

const SIZE = 64; // corner mascot, matches MASTER.md §3.1 (64x64)
const SRC = 64;  // offscreen master grid

interface Particle {
  kind: 'z' | 'sparkle';
  x: number;
  y: number;
  born: number;
}

/**
 * Bottom-right corner mascot. A canvas-rendered orange tabby that cycles idle
 * moods and reacts to machine state (active / error / quota / time-of-day).
 * `chatty` shows a rotating quote bubble; `quiet` shows the cat only; `off`
 * renders nothing. The 7-state machine and quote logic are unchanged from the
 * SVG version — only the body became a canvas.
 */
export function Mascot({ mode = 'chatty', chatStreaming, lastError }: MascotProps) {
  const state = useMascotState({ chatStreaming, lastError });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));

  // Rotate the quote every 12s while visible.
  useEffect(() => {
    if (mode !== 'chatty') return;
    const id = setInterval(() => setSeed((s) => s + 1), 12_000);
    return () => clearInterval(id);
  }, [mode]);

  // Roll a fresh quote when state transitions so the bubble follows the mood.
  useEffect(() => {
    setSeed((s) => s + 1);
  }, [state]);

  const quote = useMemo(() => (mode === 'chatty' ? pickQuote(state, seed) : null), [mode, state, seed]);

  // Per-frame state held across rAF ticks (refs, not React state — these change
  // 60x/sec and must not trigger re-renders).
  const masterRef = useRef<HTMLCanvasElement | null>(null);
  const cyclerRef = useRef<CyclerState | null>(null);
  const blinkRef = useRef({ until: 0, next: 0 });
  const partsRef = useRef<Particle[]>([]);
  const partNextRef = useRef(0);

  const draw = (ctx: CanvasRenderingContext2D, nowMs: number) => {
    if (!masterRef.current) {
      masterRef.current = document.createElement('canvas');
      masterRef.current.width = SRC;
      masterRef.current.height = SRC;
    }
    const master = masterRef.current;
    const mx = master.getContext('2d');
    if (!mx) return;

    // Resolve the pose: idle defers to the sub-mood cycler.
    if (!cyclerRef.current) cyclerRef.current = initCycler(nowMs, Math.random);
    if (state === 'idle') cyclerRef.current = advanceCycler(cyclerRef.current, nowMs, Math.random);
    const pose = POSES[poseNameFor(state, cyclerRef.current.mood)];

    // Blink on a slow random cadence; suppressed for closed-eye poses.
    const canBlink = pose.eye !== 'closed';
    if (canBlink && nowMs > blinkRef.current.next) {
      blinkRef.current.until = nowMs + 135;
      blinkRef.current.next = nowMs + 2200 + Math.random() * 3200;
    }
    const blink = canBlink && nowMs < blinkRef.current.until;

    const motion = computeMotion(pose, nowMs / 1000);

    mx.clearRect(0, 0, SRC, SRC);
    drawFront(mx, { eye: pose.eye, mouth: pose.mouth, droop: pose.droop, blink, t: nowMs / 1000, motion });

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(master, 0, 0, SRC, SRC, 0, 0, SIZE, SIZE);

    // Particle overlay: z's drift up when snoozing, sparkles pop when energetic.
    if (pose.particle && nowMs > partNextRef.current) {
      if (pose.particle === 'z') {
        partsRef.current.push({ kind: 'z', x: 42, y: 12, born: nowMs });
        partNextRef.current = nowMs + 750;
      } else {
        const a = Math.random() * 6.28;
        const r = 22 + Math.random() * 8;
        partsRef.current.push({ kind: 'sparkle', x: 32 + Math.cos(a) * r, y: 30 + Math.sin(a) * r * 0.7, born: nowMs });
        partNextRef.current = nowMs + 220;
      }
    }
    partsRef.current = partsRef.current.filter((p) => nowMs - p.born < (p.kind === 'z' ? 1700 : 650));
    for (const p of partsRef.current) {
      const life = p.kind === 'z' ? 1700 : 650;
      const age = (nowMs - p.born) / life;
      ctx.globalAlpha = Math.max(0, 1 - age);
      if (p.kind === 'z') {
        ctx.fillStyle = '#cdb189';
        ctx.font = `600 ${9 + age * 8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('z', p.x + age * 16, p.y - age * 22);
      } else {
        ctx.fillStyle = age < 0.5 ? '#F4B777' : '#FFFFFF';
        const s = 2.4 * (1 - age) + 0.8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(age * 3);
        ctx.fillRect(-s / 2, -s * 1.6, s, s * 3.2);
        ctx.fillRect(-s * 1.6, -s / 2, s * 3.2, s);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  };

  if (mode === 'off') return null;

  return (
    <div className="pointer-events-none absolute bottom-3 right-4 flex items-end gap-2">
      {quote && (
        <div className="pointer-events-auto max-w-[220px] rounded-lg border border-border bg-card px-3 py-1.5 text-xs leading-snug text-foreground shadow-xs">
          {quote}
        </div>
      )}
      <MascotCanvas
        width={SIZE}
        height={SIZE}
        draw={draw}
        className="pointer-events-auto"
        ariaLabel={`Sanji is ${state}`}
      />
    </div>
  );
}

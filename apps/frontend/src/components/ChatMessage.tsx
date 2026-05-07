import { useEffect, useRef, useState } from 'react';
import type { Turn } from './applyEvent';

export interface ChatMessageProps {
  turn: Turn;
  streaming?: boolean;
}

// The typewriter animation drains buffered SSE text into the visible string
// at a rate scaled by how much is still unrendered: longer outputs catch up
// faster so a 5000-char reply doesn't crawl while a 50-char reply doesn't
// blur. The `TARGET_DRAIN_MS` knob is "how long should it take to render
// what's currently buffered, assuming no new deltas arrive" — clamped on
// both ends so the animation always feels alive but never sluggish.
const TARGET_DRAIN_MS = 500;
const MIN_CPS = 50;
const MAX_CPS = 5000;

function useTypewriter(fullText: string, streaming: boolean): string {
  const [visible, setVisible] = useState('');
  const fullRef = useRef(fullText);
  fullRef.current = fullText;
  const visibleLenRef = useRef(0);

  useEffect(() => {
    if (!streaming) {
      // Snap to full text the moment streaming ends so the user never sees
      // a half-typed reply persist after the assistant is done.
      visibleLenRef.current = fullRef.current.length;
      setVisible(fullRef.current);
      return;
    }

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      const full = fullRef.current;
      const remaining = full.length - visibleLenRef.current;
      if (remaining > 0) {
        const cps = Math.max(MIN_CPS, Math.min(MAX_CPS, (remaining * 1000) / TARGET_DRAIN_MS));
        const advance = Math.max(1, Math.round((cps * dt) / 1000));
        visibleLenRef.current = Math.min(full.length, visibleLenRef.current + advance);
        setVisible(full.slice(0, visibleLenRef.current));
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [streaming]);

  return visible;
}

export function ChatMessage({ turn, streaming }: ChatMessageProps) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[68ch] whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-sm text-foreground">
          {turn.content}
        </div>
      </div>
    );
  }

  const fullText = turn.deltas.join('');
  const text = useTypewriter(fullText, streaming === true);

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[68ch] whitespace-pre-wrap rounded-md border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground">
        {text || (
          <span className="inline-flex items-center gap-1 text-muted-foreground/60">
            <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
            <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:120ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:240ms]" />
          </span>
        )}
        {streaming && text && (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse bg-primary/70" />
        )}
      </div>

      {/* Tool calls are intentionally not rendered here — the agent's
          mcp__sanji-tools__* invocations are noise for the user. They
          still drive the agent loop on the backend; only the surfacing
          is suppressed. The applyEvent reducer continues to capture
          them for debugging via the turn.toolCalls field. */}

      {turn.errors.map((err, i) => (
        <div
          key={i}
          className="max-w-[68ch] rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {err}
        </div>
      ))}
    </div>
  );
}

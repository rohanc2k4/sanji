import { useEffect, useMemo, useState } from 'react';
import { pickQuote } from './quotes';
import { useMascotState, type MascotInputs, type MascotState } from './useMascotState';

export type MascotMode = 'chatty' | 'quiet' | 'off';

export interface MascotProps {
  mode?: MascotMode;
  chatStreaming: boolean;
  lastError: MascotInputs['lastError'];
}

/**
 * Bottom-right corner mascot. Renders a small orange-tabby cat SVG that
 * switches expression based on derived state (idle / active / error /
 * quota / time-of-day buckets). In `chatty` mode it shows a rotating
 * quote bubble; `quiet` shows the sprite only; `off` renders nothing.
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

  if (mode === 'off') return null;

  return (
    <div className="pointer-events-none absolute bottom-3 right-4 flex items-end gap-2">
      {quote && (
        <div className="pointer-events-auto max-w-[220px] rounded-lg border border-border bg-card px-3 py-1.5 text-xs leading-snug text-foreground shadow-xs">
          {quote}
        </div>
      )}
      <div className="pointer-events-auto text-primary motion-safe:animate-mascot-breathe" aria-label={`Sanji is ${state}`}>
        <CatFace state={state} />
      </div>
    </div>
  );
}

function CatFace({ state }: { state: MascotState }) {
  return (
    <svg viewBox="0 0 80 80" width="64" height="64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* ears */}
      <polygon
        points="20,20 26,4 38,18"
        fill="currentColor"
        className={state === 'active' ? 'origin-[26px_18px] motion-safe:animate-ear-twitch' : ''}
      />
      <polygon points="60,20 54,4 42,18" fill="currentColor" />
      {/* inner ears */}
      <polygon points="24,18 27,9 33,17" fill="rgba(0,0,0,0.22)" />
      <polygon points="56,18 53,9 47,17" fill="rgba(0,0,0,0.22)" />
      {/* head */}
      <ellipse cx="40" cy="46" rx="26" ry="22" fill="currentColor" />
      {/* tabby stripes */}
      <path
        d="M40 26 Q34 32 30 40 M40 26 Q46 32 50 40 M40 30 L40 36"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* eyes per state */}
      <Eyes state={state} />
      {/* nose */}
      <path d="M37 52 L43 52 L40 55 Z" fill="rgba(40,20,10,0.7)" />
      {/* whiskers */}
      <g stroke="rgba(40,20,10,0.4)" strokeWidth="0.8" strokeLinecap="round">
        <line x1="14" y1="50" x2="28" y2="51" />
        <line x1="14" y1="55" x2="28" y2="54" />
        <line x1="66" y1="50" x2="52" y2="51" />
        <line x1="66" y1="55" x2="52" y2="54" />
      </g>
      {/* mouth */}
      <path
        d="M37 56 Q40 58 43 56"
        stroke="rgba(40,20,10,0.7)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function Eyes({ state }: { state: MascotState }) {
  const stroke = 'rgba(20,12,4,0.85)';
  switch (state) {
    case 'active':
    case 'evening':
      // wide alert
      return (
        <g fill={stroke}>
          <circle cx="32" cy="44" r="2.6" />
          <circle cx="48" cy="44" r="2.6" />
          {/* highlight dots */}
          <circle cx="33" cy="43.2" r="0.7" fill="rgba(255,255,255,0.85)" />
          <circle cx="49" cy="43.2" r="0.7" fill="rgba(255,255,255,0.85)" />
        </g>
      );
    case 'afternoon':
      // half-closed (after lunch)
      return (
        <g stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M28 44 Q32 46 36 44" />
          <path d="M44 44 Q48 46 52 44" />
        </g>
      );
    case 'error':
      // X eyes
      return (
        <g stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
          <line x1="29" y1="42" x2="35" y2="46" />
          <line x1="29" y1="46" x2="35" y2="42" />
          <line x1="45" y1="42" x2="51" y2="46" />
          <line x1="45" y1="46" x2="51" y2="42" />
        </g>
      );
    case 'quota':
      // tired droopy
      return (
        <g stroke={stroke} strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M28 45 L36 45" />
          <path d="M44 45 L52 45" />
          <path d="M28 47 Q32 45 36 47" />
          <path d="M44 47 Q48 45 52 47" />
        </g>
      );
    case 'idle':
    case 'morning':
    default:
      // closed/sleeping
      return (
        <g stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M28 44 Q32 41 36 44" />
          <path d="M44 44 Q48 41 52 44" />
        </g>
      );
  }
}

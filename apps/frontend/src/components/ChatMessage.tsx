import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { SessionBreak } from '@/chat/SessionBreak';
import { SanjiAvatar } from '@/mascot/SanjiAvatar';
import { normalizeMath } from '@/chat/normalizeMath';
import type { Turn } from './applyEvent';

export interface ChatMessageProps {
  turn: Turn;
  streaming?: boolean;
  /**
   * Wall-clock elapsed seconds since the user pressed send, threaded down
   * from useChat. Only set on the streaming assistant turn (others get
   * undefined). Rendered alongside the activity label as "· <n>s".
   */
  elapsedSec?: number;
}

/** Tiny circular spinner. Tailwind animate-spin on an SVG ring. Used in
 * place of the previous bouncing-dots indicator. Single component so the
 * activity status line and any future "thinking" surfaces share one
 * visual. */
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`size-3 animate-spin text-muted-foreground/70 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Gemini-style word reveal: rather than appending characters as SSE chunks
// arrive (which looks lumpy because chunks vary in size), buffer the text
// and reveal it word-by-word at a controlled cadence. Each newly-mounted
// word span gets a CSS blur+fade-in animation. The reveal rate (in words
// per second) scales with how many words are still unrevealed so longer
// outputs catch up faster — short replies feel deliberate, long replies
// flow rapidly.
//
// Gating notes (from researching Gemini clones / LibreChat thread):
//   - Word-level, not char-level. Char streaming reads as glitchy at any
//     reasonable rate; word reveal feels human.
//   - Each word has its OWN ~400ms blur fade-in. The reveal cadence
//     determines how often a new word starts animating; the animations
//     overlap, producing a continuous ripple.
//   - Keys must be stable so React doesn't re-animate already-revealed
//     words on every re-render. We key by token index in the split array.

const STREAMING_MIN_WPS = 10;
const STREAMING_MAX_WPS = 40;
const STREAMING_DRAIN_MS = 600;
const POST_STREAM_MIN_WPS = 60;

function countWords(s: string): number {
  // Whitespace-delimited tokens, ignoring empty tokens between consecutive
  // whitespace runs. Same definition that the render-side tokenizer uses.
  return s.trim().length === 0 ? 0 : s.trim().split(/\s+/).length;
}

function useGeminiReveal(fullText: string, streaming: boolean): number {
  const [revealed, setRevealed] = useState(0);
  const fullRef = useRef(fullText);
  fullRef.current = fullText;
  const revealedRef = useRef(0);
  const streamingRef = useRef(streaming);
  streamingRef.current = streaming;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      const total = countWords(fullRef.current);
      const remaining = total - revealedRef.current;

      if (remaining > 0) {
        // While streaming, keep ~600ms ahead of the buffer (catch up to
        // remaining within ~600ms, clamped). Once streaming ends, drain
        // any leftover at a faster rate so a half-revealed reply doesn't
        // linger after the assistant's done.
        const wps = streamingRef.current
          ? Math.max(STREAMING_MIN_WPS, Math.min(STREAMING_MAX_WPS, (remaining * 1000) / STREAMING_DRAIN_MS))
          : Math.max(POST_STREAM_MIN_WPS, remaining * 4);
        const advance = Math.max(1, Math.round((wps * dt) / 1000));
        revealedRef.current = Math.min(total, revealedRef.current + advance);
        setRevealed(revealedRef.current);
      }

      // Park the loop once the message is fully revealed AND streaming has
      // ended. While streaming is still in flight (remaining could be 0
      // momentarily between SSE chunks), keep ticking so the next chunk's
      // words start animating without a cold-start delay. Once both
      // conditions hold, parking the RAF avoids a permanent 60fps loop per
      // completed message — without this, a long conversation accumulates
      // one idle RAF loop per assistant turn.
      if (revealedRef.current >= countWords(fullRef.current) && !streamingRef.current) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return revealed;
}

function renderRevealed(fullText: string, revealedWordCount: number): ReactNode[] {
  // Split keeping whitespace runs as separate tokens so we preserve the
  // original spacing (newlines, multiple spaces in code blocks, etc.).
  const tokens = fullText.split(/(\s+)/);
  const output: ReactNode[] = [];
  let wordIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const isWhitespace = /^\s+$/.test(token);
    if (token.length === 0) continue;
    if (isWhitespace) {
      // Whitespace is rendered only when the preceding word has been revealed.
      if (wordIndex > 0 && wordIndex <= revealedWordCount) output.push(token);
      continue;
    }
    if (wordIndex >= revealedWordCount) break;
    output.push(
      <span key={i} className="animate-word-fade-in">
        {token}
      </span>,
    );
    wordIndex++;
  }
  return output;
}

export function ChatMessage({ turn, streaming, elapsedSec }: ChatMessageProps) {
  // Auto-clear divider. Renders the SessionBreak component, which shows a
  // horizontal rule with a "fresh thread" label. Trigger and message map
  // 1:1 from the session_break turn variant.
  if (turn.role === 'session_break') {
    return <SessionBreak trigger={turn.trigger} message={turn.message} />;
  }
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
  const revealedCount = useGeminiReveal(fullText, streaming === true);
  const totalWords = countWords(fullText);
  const stillRevealing = revealedCount < totalWords;
  // Once the response is fully revealed AND the model is done streaming,
  // swap from the per-word fade-in plain-text view to a fully-rendered
  // markdown view. While streaming, the per-word view is the only sane
  // thing to do — partial markdown ("## hel" mid-token) renders ugly. The
  // flicker on swap is small because by the time we swap, the user's eye
  // is already at the bottom of the message.
  const showMarkdown =
    streaming !== true && revealedCount >= totalWords && fullText.length > 0;

  // The activity status line replaces the previous bouncing-dots indicator.
  // It surfaces whenever the assistant is streaming, regardless of whether
  // text has started revealing. Three phases:
  //   1. tool call in flight  → currentActivity from tool_call_start
  //   2. text deltas flowing → "Writing answer · <n> tokens"
  //   3. nothing yet         → "Thinking"
  // The line disappears once streaming flips false (success or error).
  const showActivity = streaming === true;
  // Rough token estimate: ~4 chars/token, the standard heuristic for
  // English text. Good enough for a status counter; we deliberately don't
  // count actual SSE deltas because chunk size is provider-dependent.
  const writingTokens = Math.max(1, Math.round(fullText.length / 4));
  const activityLabel = (() => {
    if (turn.role !== 'assistant') return null;
    if (turn.currentActivity) return turn.currentActivity;
    if (fullText.length > 0) return `Writing answer · ${writingTokens} tokens`;
    return 'Thinking';
  })();
  const elapsedSuffix =
    typeof elapsedSec === 'number' ? ` · ${elapsedSec}s` : '';
  const hasBody = fullText.length > 0;

  return (
    <div className="flex items-start gap-3">
      <SanjiAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
      {showActivity && (
        <div
          className="flex max-w-[68ch] items-center gap-2 text-sm text-muted-foreground"
          data-testid="chat-activity-status"
        >
          <Spinner />
          <span className="truncate">
            {activityLabel}
            {elapsedSuffix}
          </span>
        </div>
      )}
      {showMarkdown ? (
        <div className="chat-markdown max-w-[68ch]">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeMath(fullText)}</ReactMarkdown>
        </div>
      ) : hasBody ? (
        <div className="max-w-[68ch] whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {renderRevealed(fullText, revealedCount)}
          {streaming && stillRevealing && (
            <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse bg-primary/70" />
          )}
        </div>
      ) : null}

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
    </div>
  );
}

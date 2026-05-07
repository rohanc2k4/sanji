import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Turn } from './applyEvent';

export interface ChatMessageProps {
  turn: Turn;
  streaming?: boolean;
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

  // The pending "..." dots indicator is gated on `streaming === true` so it
  // can never persist after the SSE stream closes. If a turn ends with no
  // text deltas (e.g. assistant only made tool calls, or the stream was
  // aborted, or the backend errored before any text arrived), the
  // not-streaming branch renders nothing for the body and only any errors
  // surface below. Without this gate, a dots indicator that mounted on a
  // turn with no deltas would stay visible forever (revealedCount === 0,
  // total === 0 → previous code path always rendered the dots).
  const showPendingDots = streaming === true && revealedCount === 0;
  const hasBody = fullText.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {showMarkdown ? (
        <div className="chat-markdown max-w-[68ch]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullText}</ReactMarkdown>
        </div>
      ) : showPendingDots ? (
        <div className="max-w-[68ch] whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          <span className="inline-flex items-center gap-1 text-muted-foreground/60">
            <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
            <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:120ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:240ms]" />
          </span>
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
  );
}

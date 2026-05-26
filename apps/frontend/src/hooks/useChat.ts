import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@sanji/shared';
import { chatStream } from '@/api/chat';
import { runIdleWatcher, shouldClearOnThreshold, type IdleWatcher } from '@/chat/auto-clear';
import { getModelMetadata } from '@/chat/model-metadata';
import { sessionMessageFor, type SessionTrigger } from '@/chat/session-messages';
import {
  applyEvent,
  makeAssistantTurn,
  type Turn,
} from '@/components/applyEvent';

/**
 * Flatten the chat's Turn[] (UI shape with deltas + tool calls) into the
 * ChatMessage[] history shape the backend expects. Assistant turns
 * collapse their delta array into a single content string; tool calls
 * are dropped from the history we send to the LLM (the model already
 * saw them in the original turn — we don't re-feed tool_use/tool_result
 * blocks to keep the request shape simple for v0.1). User turns map
 * directly. The latest user message gets appended by the caller.
 */
export function turnsToHistory(turns: Turn[], latestUserMessage: string): ChatMessage[] {
  const history: ChatMessage[] = [];
  for (const t of turns) {
    if (t.role === 'session_break') continue;
    if (t.role === 'user') {
      history.push({ role: 'user', content: t.content });
    } else {
      const text = t.deltas.join('');
      if (text.length === 0) continue;
      history.push({ role: 'assistant', content: text });
    }
  }
  history.push({ role: 'user', content: latestUserMessage });
  return history;
}

/**
 * Build the session_break turn produced by clear() (and, in later tasks, by
 * the idle / threshold auto-clear effects). Lives here alongside
 * makeAssistantTurn so all turn-construction helpers are colocated; the
 * pure cat-voiced messages live in `@/chat/session-messages`.
 */
export function makeSessionBreakTurn(trigger: SessionTrigger, timestamp: Date): Turn {
  return {
    role: 'session_break',
    trigger,
    message: sessionMessageFor(trigger),
    timestamp,
  };
}

export interface UsageState {
  /**
   * Latest reported `input_tokens` (size of the next prompt the model would
   * receive). Anthropic re-reports the FULL prompt each turn, so this is a
   * replacement, not an accumulation. Use this directly for "how full is
   * the context" math.
   */
  inputTokens: number;
  /** Sum of output_tokens reported across all completed turns this conversation. */
  outputTokens: number;
}

export const ZERO_USAGE: UsageState = { inputTokens: 0, outputTokens: 0 };

/**
 * Convert an `idleMinutes` config value into milliseconds for the idle
 * watcher. Floors fractional minutes and clamps anything ≤ 0 to a 1-minute
 * floor so a misconfigured `auto_clear_idle_minutes = 0` doesn't immediately
 * fire a clear on every render. Exported pure for testing.
 */
export function computeIdleMs(idleMinutes: number): number {
  const minutes = Math.max(1, Math.floor(idleMinutes || 0));
  return minutes * 60 * 1000;
}

/**
 * Pure reducer for the accumulated-usage state. Exported so the hook's
 * accumulation behavior is unit-testable without standing up a React
 * renderer (this codebase doesn't pull in @testing-library/react). The
 * hook calls this from its setUsage callback on every usage_update event.
 */
export function applyUsageUpdate(
  prev: UsageState,
  evt: { input_tokens?: number; output_tokens?: number },
): UsageState {
  return {
    // input_tokens from Anthropic is the FULL prompt size for that turn
    // (it already includes prior history). Accumulating double-counts;
    // take the latest sample as the replacement value.
    inputTokens: evt.input_tokens ?? prev.inputTokens,
    outputTokens: prev.outputTokens + (evt.output_tokens ?? 0),
  };
}

export interface UseChatResult {
  turns: Turn[];
  streaming: boolean;
  /**
   * Wall-clock seconds since the most recent send() call started, ticking
   * every 250ms while streaming is true. Resets to 0 on each new send and
   * freezes on stream close. Consumers render this as "· <elapsed>s" in the
   * activity status line; no fake ETA is computed.
   */
  elapsedSec: number;
  /** Accumulated token usage across all turns this conversation. */
  usage: UsageState;
  send: (message: string, model?: string) => void;
  abort: () => void;
  /**
   * Wipe the conversation: reset turns + usage + abort any in-flight send,
   * then drop in a single `session_break` turn tagged with the trigger that
   * caused the clear. Used by the /clear slash and the header Clear button
   * (`'manual'`) and, in later tasks, by the idle / threshold auto-clear
   * effects. Default trigger is `'manual'` so call sites that don't care
   * stay terse. The token counter goes back to 0; the next send starts a
   * fresh conversation that begins after the divider.
   */
  clear: (opts?: { trigger?: SessionTrigger }) => void;
  /**
   * Reset the idle-watcher countdown. Called internally on every send-start
   * and exposed so the Composer can debounce-call it on user typing — both
   * count as activity that should defer the idle auto-clear.
   */
  noteActivity: () => void;
  /**
   * True when accumulated usage has crossed the configured threshold and the
   * user hasn't acted on it yet. Surfaces a "context filling up · clear to
   * keep answers sharp" notice in the UI; the user clicks to clear, OR
   * we let the next idle trigger handle it. We do NOT auto-clear on
   * stream-close because that wipes the answer they just got.
   */
  thresholdWarning: boolean;
  /**
   * Manually dismiss the threshold warning without clearing the
   * conversation. Resets after the next clear automatically.
   */
  dismissThresholdWarning: () => void;
}

export interface UseChatOpts {
  /**
   * Minutes of no activity before the idle auto-clear fires. Defaults to 30
   * so consumers that don't pass anything still get the documented behavior.
   * Wired from `config.chat.autoClearIdleMinutes` by ChatShell.
   */
  idleMinutes?: number;
  /**
   * Fraction of the active model's contextWindow at which the threshold
   * auto-clear fires. 0..1. Defaults to 0.75. Wired from
   * `config.chat.autoClearThreshold` by ChatShell.
   */
  threshold?: number;
  /**
   * Active model id from the picker. Used to look up contextWindow when
   * checking the threshold against accumulated usage. Defaults to the
   * v0.1 sonnet id so consumers that don't pass it still behave sensibly.
   */
  modelId?: string;
}

export function useChat(opts?: UseChatOpts): UseChatResult {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [usage, setUsage] = useState<UsageState>(ZERO_USAGE);
  const [thresholdWarning, setThresholdWarning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  // Mirror of `turns` for synchronous reads inside send(). useState's
  // setter callback gives us prior state but we also need to build the
  // outgoing history *before* the new turns are appended; the ref lets
  // us capture that snapshot without depending on a stale closure.
  const turnsRef = useRef<Turn[]>([]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  // Cross-handler coordination for the idle auto-clear:
  //   - streamingRef mirrors `streaming` so the watcher's onFire callback
  //     can read the latest value synchronously without re-arming on every
  //     render.
  //   - pendingClearRef captures a deferred trigger when the watcher fires
  //     mid-stream; the SSE done handler consumes it after streaming flips
  //     false so the divider lands on a quiet conversation.
  //   - idleWatcherRef holds the active watcher so noteActivity can reset
  //     it imperatively.
  const streamingRef = useRef<boolean>(false);
  const pendingClearRef = useRef<SessionTrigger | null>(null);
  const idleWatcherRef = useRef<IdleWatcher | null>(null);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);

  // Threshold + active model live in refs so the setUsage callback (which
  // captures only its initial closure) reads the current values rather than
  // a stale snapshot when the picker or config changes mid-conversation.
  const thresholdRef = useRef<number>(opts?.threshold ?? 0.75);
  const modelIdRef = useRef<string>(opts?.modelId ?? 'claude-sonnet-4-6');
  useEffect(() => {
    thresholdRef.current = opts?.threshold ?? 0.75;
  }, [opts?.threshold]);
  useEffect(() => {
    modelIdRef.current = opts?.modelId ?? 'claude-sonnet-4-6';
  }, [opts?.modelId]);

  // Tick elapsedSec every 250ms while streaming. Cleared on stream close so
  // the value freezes on the last sample rather than continuing to climb.
  useEffect(() => {
    if (!streaming) return;
    const id = window.setInterval(() => {
      if (startedAtRef.current == null) return;
      setElapsedSec(Math.floor((performance.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [streaming]);

  const send = useCallback((message: string, model?: string) => {
    // If a previous send is still in flight, cancel it before starting the
    // new one. Aborting fires the previous async loop's catch path with a
    // signal.aborted error, the loop returns early, and its finally block
    // skips the streaming-state cleanup because ctrlRef.current already
    // points at the NEW controller by then. The previous assistant turn
    // keeps whatever partial deltas came through; ChatPane gates the
    // typing indicator on `i === turns.length - 1`, so the orphaned turn
    // collapses to its rendered text without a dangling pending state.
    if (ctrlRef.current) {
      ctrlRef.current.abort();
      ctrlRef.current = null;
    }
    // Snapshot prior turns BEFORE appending the new user turn + pending
    // assistant turn so the history we POST contains only completed
    // turns plus the latest user message (assembled by turnsToHistory).
    const historyToSend = turnsToHistory(turnsRef.current, message);
    setTurns((prev) => [
      ...prev,
      { role: 'user', content: message },
      makeAssistantTurn(),
    ]);
    startedAtRef.current = performance.now();
    setElapsedSec(0);
    setStreaming(true);
    // Sending counts as activity — reset the idle countdown so a long
    // back-and-forth never trips the auto-clear mid-conversation.
    idleWatcherRef.current?.reset();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    (async () => {
      try {
        for await (const ev of chatStream({ messages: historyToSend, model }, ctrl.signal)) {
          if (ev.type === 'usage_update') {
            // Accumulate across turns. The backend reports this turn's
            // input + output tokens; the conversation-level totals are
            // the running sum (which is what the context bar wants —
            // "what's the model's prompt size when I send the next turn"
            // grows monotonically until clear()).
            setUsage((u) => {
              const next = applyUsageUpdate(u, ev);
              const cw = getModelMetadata(modelIdRef.current).contextWindow;
              if (shouldClearOnThreshold(next, cw, thresholdRef.current)) {
                // Surface a banner. Do NOT auto-clear on stream close —
                // that wipes the completed answer the user just got. The
                // user clicks the banner to clear explicitly, or the next
                // idle trigger lands the divider if they walk away.
                setThresholdWarning(true);
              }
              return next;
            });
            continue;
          }
          setTurns((prev) => applyEvent(prev, ev));
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setTurns((prev) => applyEvent(prev, { type: 'error', message: msg }));
      } finally {
        // Only clear streaming state if THIS send is still the active one.
        // If a newer send already replaced ctrlRef.current (resend-while-
        // in-flight path), the newer send owns the streaming flag and
        // we must not flip it false underneath it.
        if (ctrlRef.current === ctrl) {
          ctrlRef.current = null;
          setStreaming(false);
          // If the idle watcher fired mid-stream, it stashed the trigger
          // here. Now that we've quieted the conversation, consume it and
          // run the deferred clear. Snapshot + null first so a synchronous
          // re-entry into clear() doesn't re-fire from the same pointer.
          const pending = pendingClearRef.current;
          pendingClearRef.current = null;
          if (pending !== null) {
            clear({ trigger: pending });
          }
        }
      }
    })();
  }, []);

  const abort = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setStreaming(false);
  }, []);

  const clear = useCallback((opts?: { trigger?: SessionTrigger }) => {
    const trigger = opts?.trigger ?? 'manual';
    // Cancel any in-flight stream first so its finally block doesn't race
    // with the reset and re-flip streaming back on. Then wipe state in the
    // same render: turns become a single session_break divider tagged with
    // the trigger, usage zeroed, elapsed counter frozen.
    if (ctrlRef.current) {
      ctrlRef.current.abort();
      ctrlRef.current = null;
    }
    startedAtRef.current = null;
    setTurns([makeSessionBreakTurn(trigger, new Date())]);
    setUsage(ZERO_USAGE);
    setElapsedSec(0);
    setStreaming(false);
    setThresholdWarning(false);
  }, []);

  const dismissThresholdWarning = useCallback(() => {
    setThresholdWarning(false);
  }, []);

  const noteActivity = useCallback(() => {
    idleWatcherRef.current?.reset();
  }, []);

  // Arm the idle watcher once on mount; re-arm if idleMinutes changes. The
  // onFire callback checks streamingRef synchronously: if the user is
  // mid-stream when the timer trips, we stash the trigger and let the SSE
  // done handler land the divider once the stream closes (a quiet
  // conversation is the right surface for the cat-voiced break message).
  const idleMinutes = opts?.idleMinutes ?? 30;
  useEffect(() => {
    const idleMs = computeIdleMs(idleMinutes);
    const watcher = runIdleWatcher({
      idleMs,
      onFire: () => {
        if (streamingRef.current) {
          pendingClearRef.current = 'idle';
          return;
        }
        clear({ trigger: 'idle' });
      },
    });
    idleWatcherRef.current = watcher;
    return () => {
      watcher.cancel();
      idleWatcherRef.current = null;
    };
  }, [idleMinutes, clear]);

  return {
    turns,
    streaming,
    elapsedSec,
    usage,
    send,
    abort,
    clear,
    noteActivity,
    thresholdWarning,
    dismissThresholdWarning,
  };
}

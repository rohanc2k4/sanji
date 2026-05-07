import { useCallback, useEffect, useRef, useState } from 'react';
import { chatStream } from '@/api/chat';
import {
  applyEvent,
  makeAssistantTurn,
  type Turn,
} from '@/components/applyEvent';

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
  send: (message: string, model?: string) => void;
  abort: () => void;
}

export function useChat(): UseChatResult {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

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
    setTurns((prev) => [
      ...prev,
      { role: 'user', content: message },
      makeAssistantTurn(),
    ]);
    startedAtRef.current = performance.now();
    setElapsedSec(0);
    setStreaming(true);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    (async () => {
      try {
        for await (const ev of chatStream({ message, model }, ctrl.signal)) {
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
        }
      }
    })();
  }, []);

  const abort = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setStreaming(false);
  }, []);

  return { turns, streaming, elapsedSec, send, abort };
}

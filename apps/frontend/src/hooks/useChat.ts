import { useCallback, useRef, useState } from 'react';
import { chatStream } from '@/api/chat';
import {
  applyEvent,
  makeAssistantTurn,
  type Turn,
} from '@/components/applyEvent';

export interface UseChatResult {
  turns: Turn[];
  streaming: boolean;
  send: (message: string, model?: string) => void;
  abort: () => void;
}

export function useChat(): UseChatResult {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);

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

  return { turns, streaming, send, abort };
}

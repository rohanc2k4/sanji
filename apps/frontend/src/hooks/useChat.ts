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
    if (ctrlRef.current) return;
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

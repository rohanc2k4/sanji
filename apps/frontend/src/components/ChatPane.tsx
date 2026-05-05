import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { Turn } from './applyEvent';

export interface ChatPaneProps {
  turns: Turn[];
  streaming: boolean;
}

export function ChatPane({ turns, streaming }: ChatPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, streaming]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
            {turns.map((turn, i) => (
              <ChatMessage
                key={i}
                turn={turn}
                streaming={streaming && i === turns.length - 1 && turn.role === 'assistant'}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-3 text-4xl" aria-hidden>
          🐈
        </div>
        <div className="text-base font-medium text-foreground">What are we figuring out today?</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask a question, run a skill like <span className="font-mono text-foreground/80">/recap</span>, or pick a source from the sidebar.
        </p>
      </div>
    </div>
  );
}

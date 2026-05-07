import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ChatMessage } from './ChatMessage';
import { Mascot } from '@/mascot/Mascot';
import type { Turn } from './applyEvent';

export interface ChatPaneProps {
  turns: Turn[];
  streaming: boolean;
  onFilesDropped: (files: File[]) => void;
}

export function ChatPane({ turns, streaming, onFilesDropped }: ChatPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, streaming]);

  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    if (![...e.dataTransfer.types].includes('Files')) return;
    dragDepth.current += 1;
    setIsDragOver(true);
  }
  function onDragLeave(_e: DragEvent<HTMLDivElement>) {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length > 0) onFilesDropped(files);
  }

  return (
    <div
      data-testid="chat-pane"
      className="relative flex flex-1 flex-col overflow-hidden"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6 pr-24">
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
      <Mascot mode="chatty" chatStreaming={streaming} lastError={null} />
      {isDragOver && (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-primary bg-primary/10"
          data-testid="chat-drop-overlay"
        >
          <div className="rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            Drop to ingest
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-base font-medium text-foreground">What are we figuring out today?</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask a question, run a skill like <span className="font-mono text-foreground/80">/recap</span>, or pick a source from the sidebar.
        </p>
      </div>
    </div>
  );
}

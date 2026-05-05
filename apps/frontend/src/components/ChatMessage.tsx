import type { Turn } from './applyEvent';
import { ToolCallPill } from './ToolCallPill';

export interface ChatMessageProps {
  turn: Turn;
  streaming?: boolean;
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

  const text = turn.deltas.join('');

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

      {turn.toolCalls.map((tc) => (
        <ToolCallPill key={tc.id} call={tc} />
      ))}

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

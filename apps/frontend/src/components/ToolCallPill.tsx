import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { AssistantToolCall } from './applyEvent';

export interface ToolCallPillProps {
  call: AssistantToolCall;
}

function summarize(input: unknown): string {
  try {
    const json = typeof input === 'string' ? input : JSON.stringify(input);
    return json.length > 60 ? `${json.slice(0, 60)}…` : json;
  } catch {
    return '…';
  }
}

export function ToolCallPill({ call }: ToolCallPillProps) {
  const inputSummary = useMemo(() => summarize(call.input), [call.input]);
  const done = call.result !== undefined;

  return (
    <details className="group/pill max-w-[68ch] overflow-hidden rounded-md border border-border bg-muted/30">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3 shrink-0 text-muted-foreground/60 transition-transform group-open/pill:rotate-90" />
        <span
          className={
            done
              ? 'inline-block size-1.5 shrink-0 rounded-full bg-foreground/60'
              : 'inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-primary'
          }
          aria-label={done ? 'tool call complete' : 'tool call in progress'}
        />
        <span className="font-mono font-medium text-foreground">{call.name}</span>
        <span className="truncate font-mono text-muted-foreground/70">{inputSummary}</span>
      </summary>
      <div className="space-y-3 border-t border-border bg-background/40 p-3 font-mono text-xs">
        <div>
          <div className="mb-1 uppercase tracking-wide text-muted-foreground/60">input</div>
          <pre className="whitespace-pre-wrap break-all text-foreground/90">
            {JSON.stringify(call.input, null, 2)}
          </pre>
        </div>
        {call.result !== undefined && (
          <div>
            <div className="mb-1 uppercase tracking-wide text-muted-foreground/60">result</div>
            <pre className="whitespace-pre-wrap break-all text-foreground/90">{call.result}</pre>
          </div>
        )}
      </div>
    </details>
  );
}

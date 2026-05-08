// Context-window accounting strip. Renders the running token total against
// the active model's context window plus a thin progress bar that switches
// tone at 70% and 90%. Lives in the chat header next to <ModelPicker>.
//
// The component is dumb: useChat.usage flows in as tokensUsed, the active
// model's contextWindow flows in from getModelMetadata in ChatShell. When
// the user switches models mid-conversation the bar's denominator updates
// even though the running total of tokens already burned doesn't.

export interface ContextBarProps {
  tokensUsed: number;
  contextWindow: number;
}

/**
 * Pure helper for the percentage-and-tone math, exported so the test file
 * can pin the threshold behavior without rendering JSX.
 */
export function contextBarTone(pct: number): 'low' | 'mid' | 'high' {
  if (pct >= 90) return 'high';
  if (pct >= 70) return 'mid';
  return 'low';
}

export function contextBarPercent(tokensUsed: number, contextWindow: number): number {
  if (contextWindow <= 0) return 0;
  return Math.min(100, Math.round((tokensUsed / contextWindow) * 100));
}

export function ContextBar({ tokensUsed, contextWindow }: ContextBarProps) {
  const pct = contextBarPercent(tokensUsed, contextWindow);
  const tone = contextBarTone(pct);
  const fillClass =
    tone === 'high' ? 'bg-red-500' : tone === 'mid' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      data-testid="context-bar"
      data-tone={tone}
      aria-label={`Context window: ${tokensUsed} of ${contextWindow} tokens used`}
    >
      <span className="tabular-nums">
        {tokensUsed.toLocaleString()} / {contextWindow.toLocaleString()} tokens ({pct}%)
      </span>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-[width] duration-200 ease-out ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

import type { SessionTrigger } from './session-messages';

/**
 * Label rendered inside the horizontal divider. v0.1 always shows "fresh thread"
 * regardless of the trigger that caused the break. The trigger only controls
 * whether a body message follows (cat-voiced for idle/threshold, none for manual).
 *
 * Exported for testability.
 */
export function sessionBreakLabel(_trigger: SessionTrigger): string {
  return 'fresh thread';
}

export interface SessionBreakProps {
  trigger: SessionTrigger;
  message: string | null;
}

/**
 * Visual divider rendered when a chat session has been cleared (manual button,
 * /clear slash, idle timeout, or context-window threshold). Renders a horizontal
 * line flanking the "fresh thread" label, with an optional cat-voiced message
 * body below it for auto-clear triggers.
 */
export function SessionBreak({ trigger, message }: SessionBreakProps) {
  const label = sessionBreakLabel(trigger);
  return (
    <div className="my-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex-1 border-t border-border" />
      </div>
      {message && (
        <p className="mt-3 italic text-sm text-muted-foreground text-center max-w-md mx-auto px-4">
          {message}
        </p>
      )}
    </div>
  );
}

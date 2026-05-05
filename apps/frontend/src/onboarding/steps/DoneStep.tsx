import { CheckCircle2 } from 'lucide-react';
import type { StepProps } from './VaultStep';

export function DoneStep({ state }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <SummaryRow label="Vault" value={state.vault} mono />
            <SummaryRow label="Provider" value={state.providerMode} />
            <SummaryRow label="Default model" value={state.modelDefault} mono />
            {state.calendarUrls.length > 0 && (
              <SummaryRow label="Calendars" value={`${state.calendarUrls.length} added`} />
            )}
            {state.tavilyKey && <SummaryRow label="Tavily" value="key set" />}
            <SummaryRow label="Indexed" value={`${state.indexedNotes} notes`} />
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Open Sanji to start chatting. You can change any of these later from the settings drawer.
      </p>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground/70">{label}</span>
      <span className={mono ? 'truncate font-mono text-xs text-foreground' : 'truncate text-foreground'}>
        {value}
      </span>
    </div>
  );
}

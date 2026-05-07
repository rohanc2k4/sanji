import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { StatusPhase, StatusRow } from './ingestStatus';

export interface IngestStatusPanelProps {
  rows: StatusRow[];
  onDismiss: (fileId: string) => void;
  onCancel: (fileId: string) => void;
  onOpenNote: (path: string) => void;
}

const PROGRESS_BY_PHASE: Record<StatusPhase, number> = {
  queued: 5,
  extracting: 25,
  rewriting: 60,
  writing: 90,
  done: 100,
  skipped: 100,
  error: 100,
};

const TERMINAL_AUTO_DISMISS_MS = 30_000;

function isActivePhase(p: StatusPhase): boolean {
  return p !== 'done' && p !== 'skipped' && p !== 'error';
}

export function IngestStatusPanel({
  rows,
  onDismiss,
  onCancel,
  onOpenNote,
}: IngestStatusPanelProps) {
  useEffect(() => {
    const timers = rows
      .filter((r) => r.phase === 'done' || r.phase === 'skipped')
      .map((r) => setTimeout(() => onDismiss(r.fileId), TERMINAL_AUTO_DISMISS_MS));
    return () => timers.forEach(clearTimeout);
  }, [rows, onDismiss]);

  // Tick a clock once a second while there's an active row so each row's
  // elapsed-time counter refreshes. No-op when nothing's active.
  const [now, setNow] = useState(() => Date.now());
  const hasActive = rows.some((r) => isActivePhase(r.phase));
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActive]);

  if (rows.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-[60px] z-30 w-80 space-y-1.5">
      {rows.map((r) => {
        const isActive = isActivePhase(r.phase);
        const elapsedSec =
          isActive && r.startedAt ? Math.max(0, Math.floor((now - r.startedAt) / 1000)) : null;
        return (
          <div
            key={r.fileId}
            className={[
              'pointer-events-auto rounded-md border bg-card px-3 py-2 text-xs shadow-sm',
              r.phase === 'error' ? 'border-destructive/40' : 'border-border',
            ].join(' ')}
          >
            <div className="flex items-center gap-1.5">
              {r.phase === 'done' || r.phase === 'skipped' ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
              ) : r.phase === 'error' ? (
                <AlertCircle className="size-3.5 shrink-0 text-destructive" />
              ) : (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
              )}
              <span className="truncate font-mono text-foreground" title={r.sourceName}>
                {r.sourceName}
              </span>
              <span className="ml-auto shrink-0 text-muted-foreground/70">
                {r.phase}
                {elapsedSec !== null ? ` · ${elapsedSec}s` : ''}
              </span>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() =>
                  isActive ? onCancel(r.fileId) : onDismiss(r.fileId)
                }
                aria-label={isActive ? 'Cancel ingestion' : 'Dismiss'}
              >
                <X />
              </Button>
            </div>
            {/* Rewriting can take 30-60s with no real progress signal from
                Claude, so a determinate bar would lie. Switch to an
                indeterminate animated bar during that phase; keep determinate
                progress during the short extract / write phases. */}
            {isActive && r.phase === 'rewriting' && (
              <div className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="absolute h-full w-1/3 rounded-full bg-primary animate-progress-indeterminate" />
              </div>
            )}
            {isActive && r.phase !== 'rewriting' && (
              <Progress value={PROGRESS_BY_PHASE[r.phase]} className="mt-1.5 h-1" />
            )}
            {r.phase === 'done' && r.outputPath && (
              <div className="mt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => onOpenNote(r.outputPath!)}
                  className="block w-full text-left text-muted-foreground/80 hover:text-foreground"
                >
                  ✓ Saved to <span className="font-mono">{r.outputPath}</span>, open
                </button>
                <p className="text-muted-foreground/60">
                  Drag from the sources sidebar to organize.
                </p>
              </div>
            )}
            {r.phase === 'skipped' && r.existingPath && (
              <button
                type="button"
                onClick={() => onOpenNote(r.existingPath!)}
                className="mt-1 block w-full text-left text-muted-foreground/80 hover:text-foreground"
              >
                already ingested as <span className="font-mono">{r.existingPath}</span>, open
              </button>
            )}
            {r.phase === 'error' && r.errorMessage && (
              <p className="mt-1 text-destructive">{r.errorMessage}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

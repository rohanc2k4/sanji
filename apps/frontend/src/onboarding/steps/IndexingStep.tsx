import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { initOnboarding } from '@/api/onboarding';
import { indexingStream } from '@/api/chat';
import { isApiError } from '@sanji/shared';
import { buildConfig } from '../reducer';
import type { StepProps } from './VaultStep';

type Phase = 'idle' | 'init' | 'streaming' | 'done' | 'error';

export function IndexingStep({ state, dispatch }: StepProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      ctrlRef.current?.abort();
    };
  }, []);

  async function start() {
    if (phase === 'init' || phase === 'streaming') return;
    setErrMsg(null);
    setPhase('init');

    try {
      await initOnboarding({ vault: state.vault, config: buildConfig(state) });
    } catch (err: unknown) {
      const reason = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
      setErrMsg(`Init failed: ${reason}`);
      setPhase('error');
      return;
    }

    setPhase('streaming');
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    try {
      for await (const ev of indexingStream(ctrl.signal)) {
        if (ev.kind === 'progress') {
          dispatch({ type: 'index-progress', done: ev.notesIndexed, total: ev.notesTotal });
        } else if (ev.kind === 'done') {
          // Backstop: ensure canAdvance gate passes even if the last progress
          // event didn't equal total exactly.
          const total = state.totalNotes || ev.notesIndexed || 1;
          dispatch({ type: 'index-progress', done: total, total });
          setPhase('done');
        } else if (ev.kind === 'error') {
          setErrMsg(ev.message);
          setPhase('error');
        }
      }
    } catch (err: unknown) {
      if (ctrl.signal.aborted) return;
      const reason = err instanceof Error ? err.message : String(err);
      setErrMsg(`Indexing stream broken: ${reason}. The backend may need a restart to pick up the new vault.`);
      setPhase('error');
    } finally {
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
    }
  }

  const total = state.totalNotes;
  const done = state.indexedNotes;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {phase === 'idle' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sanji will write <span className="font-mono text-foreground">.sanji/</span> in your vault, save your
            config, and start indexing. About one second per note.
          </p>
          <Button onClick={start} disabled={!state.vault || !state.providerTestResult?.ok}>
            Start indexing
          </Button>
        </div>
      )}

      {(phase === 'init' || phase === 'streaming' || phase === 'done') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {phase !== 'done' && <Loader2 className="size-3 animate-spin" />}
              <span>
                {phase === 'init' && 'Writing config…'}
                {phase === 'streaming' && `Indexing… ${done} / ${total || '?'} notes`}
                {phase === 'done' && `Indexed ${done} notes`}
              </span>
            </span>
            {total > 0 && <span className="font-mono text-foreground/80">{pct}%</span>}
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errMsg ?? 'Something went wrong.'}</span>
          </div>
          <Button onClick={start} variant="outline">
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState, type Dispatch } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { validateVault } from '@/api/onboarding';
import { isApiError } from '@sanji/shared';
import type { OnboardingAction, OnboardingState } from '../reducer';

export interface StepProps {
  state: OnboardingState;
  dispatch: Dispatch<OnboardingAction>;
}

export function VaultStep({ state, dispatch }: StepProps) {
  const [path, setPath] = useState(state.vault);
  const [busy, setBusy] = useState(false);

  async function onValidate() {
    if (!path.trim() || busy) return;
    setBusy(true);
    try {
      const result = await validateVault(path.trim());
      dispatch({ type: 'set-vault', vault: path.trim(), validation: result });
    } catch (err: unknown) {
      const reason = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
      dispatch({
        type: 'set-vault',
        vault: path.trim(),
        validation: { ok: false, noteCount: 0, hasExisting: false, reason },
      });
    } finally {
      setBusy(false);
    }
  }

  const v = state.vaultValidation;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vault-path" className="text-sm">
          Vault path
        </Label>
        <div className="flex gap-2">
          <Input
            id="vault-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onValidate();
            }}
            placeholder="/path/to/notes or ~/notes"
            autoFocus
            className="font-mono text-sm"
          />
          <Button onClick={onValidate} disabled={busy || !path.trim()}>
            {busy ? 'Checking…' : 'Validate'}
          </Button>
        </div>
      </div>

      {v?.ok && (
        <div className="rounded-md border border-border bg-card p-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            <span className="text-foreground">
              Found {v.noteCount} markdown note{v.noteCount === 1 ? '' : 's'}.
            </span>
          </div>
          {v.hasExisting && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-mono text-foreground">.sanji/</span> already exists in this vault. Continuing
              will reuse the existing index.
            </p>
          )}
        </div>
      )}

      {v && !v.ok && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{v.reason ?? 'Could not read this folder.'}</span>
        </div>
      )}
    </div>
  );
}

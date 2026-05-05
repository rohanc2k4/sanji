import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { testProvider } from '@/api/onboarding';
import { isApiError } from '@sanji/shared';
import type { StepProps } from './VaultStep';

type Mode = 'claude-code' | 'anthropic-api';

export function ProviderStep({ state, dispatch }: StepProps) {
  const [mode, setMode] = useState<Mode>(state.providerMode);
  const [apiKey, setApiKey] = useState(state.anthropicApiKey);
  const [busy, setBusy] = useState(false);

  async function onTest(selected: Mode) {
    setMode(selected);
    setBusy(true);
    try {
      const result = await testProvider({
        mode: selected,
        ...(selected === 'anthropic-api' && apiKey ? { anthropicApiKey: apiKey } : {}),
      });
      dispatch({
        type: 'set-provider',
        mode: selected,
        anthropicApiKey: selected === 'anthropic-api' ? apiKey : undefined,
        testResult: result,
      });
    } catch (err: unknown) {
      const reason = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
      dispatch({
        type: 'set-provider',
        mode: selected,
        anthropicApiKey: selected === 'anthropic-api' ? apiKey : undefined,
        testResult: { ok: false, reason },
      });
    } finally {
      setBusy(false);
    }
  }

  const result = state.providerTestResult;

  return (
    <div className="space-y-4">
      <ProviderCard
        active={mode === 'claude-code'}
        title="Claude Code subscription"
        subtitle="No per-token bill. Uses your existing Pro / Max plan."
        icon={<Sparkles className="size-4" />}
        onClick={() => onTest('claude-code')}
        busy={busy && mode === 'claude-code'}
      />

      <ProviderCard
        active={mode === 'anthropic-api'}
        title="Anthropic API key"
        subtitle="Per-token billing on api.anthropic.com."
        icon={<KeyRound className="size-4" />}
        onClick={() => setMode('anthropic-api')}
        busy={false}
      >
        {mode === 'anthropic-api' && (
          <div className="mt-3 space-y-2">
            <Label htmlFor="anthropic-key" className="text-xs">
              API key
            </Label>
            <div className="flex gap-2">
              <Input
                id="anthropic-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-…"
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={() => onTest('anthropic-api')}
                disabled={busy || !apiKey.trim()}
              >
                {busy ? 'Testing…' : 'Test'}
              </Button>
            </div>
          </div>
        )}
      </ProviderCard>

      <ProviderCard
        active={false}
        title="OpenAI / Gemini"
        subtitle="Coming in v0.2."
        icon={<Sparkles className="size-4 opacity-50" />}
        disabled
      />

      {result?.ok && state.providerMode === mode && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          Credentials look good.
        </div>
      )}
      {result && !result.ok && state.providerMode === mode && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{result.reason ?? 'Could not verify credentials.'}</span>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

function ProviderCard({ active, title, subtitle, icon, onClick, busy, disabled, children }: CardProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'block w-full rounded-md border bg-card p-4 text-left transition-colors',
        disabled
          ? 'cursor-not-allowed border-border opacity-50'
          : active
            ? 'border-primary'
            : 'border-border hover:border-foreground/30',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{title}</span>
            {busy && <span className="text-xs text-muted-foreground">testing…</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </button>
  );
}

import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { testProvider, checkClaudeCli } from '@/api/onboarding';
import { isApiError } from '@sanji/shared';
import type { StepProps } from './VaultStep';
import { CliInstallSubstep } from './CliInstallSubstep';

type Mode = 'claude-code' | 'anthropic-api';

export function ProviderStep({ state, dispatch }: StepProps) {
  const [mode, setMode] = useState<Mode>(state.providerMode);
  const [apiKey, setApiKey] = useState(state.anthropicApiKey);
  const [busy, setBusy] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [lastRecheckFailed, setLastRecheckFailed] = useState(false);

  async function runProviderTest(selected: Mode, keyForTest: string) {
    setBusy(true);
    try {
      const result = await testProvider({
        mode: selected,
        ...(selected === 'anthropic-api' && keyForTest ? { anthropicApiKey: keyForTest } : {}),
      });
      dispatch({
        type: 'set-provider',
        mode: selected,
        anthropicApiKey: selected === 'anthropic-api' ? keyForTest : undefined,
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
        anthropicApiKey: selected === 'anthropic-api' ? keyForTest : undefined,
        testResult: { ok: false, reason },
      });
    } finally {
      setBusy(false);
    }
  }

  // Subscription path: probe the CLI BEFORE attempting credentials. If
  // installed, immediately run the existing testProvider flow. If not
  // installed, dispatch the cli-check result; render() picks up the
  // sub-step on the next pass.
  async function onClaudeCodeCard() {
    setMode('claude-code');
    setBusy(true);
    try {
      const probe = await checkClaudeCli();
      if (!probe.installed) {
        dispatch({ type: 'set-cli-check', result: probe });
        setLastRecheckFailed(false);
        return;
      }
    } catch {
      // Network or other failure reaching the probe endpoint; fall through
      // to testProvider so the existing error surface kicks in.
    } finally {
      setBusy(false);
    }
    await runProviderTest('claude-code', '');
  }

  async function onApiKeyTest() {
    setMode('anthropic-api');
    await runProviderTest('anthropic-api', apiKey);
  }

  async function onRecheck() {
    setRechecking(true);
    try {
      const probe = await checkClaudeCli();
      if (probe.installed) {
        dispatch({ type: 'clear-cli-check' });
        setLastRecheckFailed(false);
        // User has already chosen subscription; auto-run credentials.
        await runProviderTest('claude-code', '');
        return;
      }
      // Still not installed: update the cli-check state with any new reason
      // and flag the "still not detected" hint for the sub-step.
      dispatch({ type: 'set-cli-check', result: probe });
      setLastRecheckFailed(true);
    } finally {
      setRechecking(false);
    }
  }

  function onBackToProviderChoice() {
    dispatch({ type: 'clear-cli-check' });
    setLastRecheckFailed(false);
  }

  // Sub-step takeover: rendered when the cli-check probe came back not-installed.
  if (state.cliCheck && !state.cliCheck.installed) {
    return (
      <CliInstallSubstep
        os={state.cliCheck.os}
        reason={state.cliCheck.reason}
        rechecking={rechecking}
        lastRecheckFailed={lastRecheckFailed}
        onRecheck={onRecheck}
        onBack={onBackToProviderChoice}
      />
    );
  }

  const result = state.providerTestResult;

  return (
    <div className="space-y-4">
      <ProviderCard
        active={mode === 'claude-code'}
        title="Claude Code subscription"
        subtitle="No per-token bill. Uses your existing Pro / Max plan."
        icon={<Sparkles className="size-4" />}
        onClick={onClaudeCodeCard}
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
                onClick={onApiKeyTest}
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

import { useState } from 'react';
import { AlertCircle, ArrowLeft, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import type { ClaudeCliOs } from '@sanji/shared';
import { Button } from '@/components/ui/button';
import {
  CLI_INSTALL_SNIPPETS,
  CLI_DOCS_URL,
} from '../cli-install-snippets';

export interface CliInstallSubstepProps {
  os: ClaudeCliOs;
  reason?: string;
  rechecking: boolean;
  lastRecheckFailed: boolean;
  onRecheck: () => void;
  onSwitchToApiKey?: () => void; // reserved for a later phase; not surfaced in v0.1 UI
  onBack: () => void;
}

const OS_OPTIONS: ClaudeCliOs[] = ['darwin', 'linux', 'win32'];

export function CliInstallSubstep({
  os: detectedOs,
  reason,
  rechecking,
  lastRecheckFailed,
  onRecheck,
  onBack,
}: CliInstallSubstepProps) {
  const [selectedOs, setSelectedOs] = useState<ClaudeCliOs>(detectedOs);
  const [showOsPicker, setShowOsPicker] = useState(false);
  const snippet = CLI_INSTALL_SNIPPETS[selectedOs];

  const copyInstallCmd = () => {
    void navigator.clipboard.writeText(snippet.installCmd);
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          Install the Claude CLI
        </h2>
        <p className="text-xs text-muted-foreground">
          Sanji uses your Claude Code subscription via the local CLI.
        </p>
      </header>

      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-md border border-border bg-card px-2 py-1 font-medium text-foreground">
          {snippet.label}
        </span>
        {!showOsPicker ? (
          <button
            type="button"
            className="text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowOsPicker(true)}
          >
            Wrong OS?
          </button>
        ) : (
          <div className="flex gap-1">
            {OS_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setSelectedOs(opt);
                  setShowOsPicker(false);
                }}
                className={[
                  'rounded-md border px-2 py-1 text-xs',
                  opt === selectedOs ? 'border-primary' : 'border-border hover:border-foreground/30',
                ].join(' ')}
              >
                {CLI_INSTALL_SNIPPETS[opt].label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-md border border-border bg-card p-3">
          <code className="flex-1 break-all font-mono text-xs text-foreground">
            {snippet.installCmd}
          </code>
          <Button size="icon-sm" variant="ghost" onClick={copyInstallCmd} title="Copy">
            <Copy className="size-3" />
            <span className="sr-only">Copy</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Then run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{snippet.postInstall}</code> once to authenticate.
        </p>
        {snippet.note && (
          <p className="text-xs text-muted-foreground">{snippet.note}</p>
        )}
      </div>

      {reason && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          <span>
            We found something but couldn't run it: <span className="font-mono">{reason}</span>
          </span>
        </div>
      )}

      <a
        href={CLI_DOCS_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Other platforms / troubleshooting
        <ExternalLink className="size-3" />
      </a>

      <div className="space-y-2 pt-2">
        <Button
          onClick={onRecheck}
          disabled={rechecking}
          className="w-full"
        >
          {rechecking ? (
            <>
              <RefreshCw className="mr-2 size-3 animate-spin" />
              Rechecking…
            </>
          ) : (
            "I've installed it, recheck"
          )}
        </Button>
        {lastRecheckFailed && (
          <p className="text-xs text-muted-foreground">
            Still not detected. Did the install finish? Try opening a new terminal so PATH refreshes.
          </p>
        )}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          <ArrowLeft className="size-3" />
          Back to provider choice
        </button>
      </div>
    </div>
  );
}

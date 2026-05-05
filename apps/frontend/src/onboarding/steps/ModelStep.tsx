import { Brain, Zap } from 'lucide-react';
import type { StepProps } from './VaultStep';

interface Choice {
  id: string;
  heavy: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const CHOICES: Choice[] = [
  {
    id: 'claude-sonnet-4-6',
    heavy: 'claude-opus-4-7',
    label: 'Sonnet 4.6 default · Opus 4.7 for /research',
    subtitle: 'Sonnet handles most queries fast; the agent escalates to Opus for heavy work.',
    icon: <Zap className="size-4" />,
    recommended: true,
  },
  {
    id: 'claude-opus-4-7',
    heavy: 'claude-opus-4-7',
    label: 'Opus 4.7 always',
    subtitle: 'Maximum capability on every turn. Slower and pricier.',
    icon: <Brain className="size-4" />,
  },
];

export function ModelStep({ state, dispatch }: StepProps) {
  function onPick(choice: Choice) {
    dispatch({ type: 'set-model', defaultModel: choice.id, heavyModel: choice.heavy });
  }

  return (
    <div className="space-y-3">
      {CHOICES.map((c) => {
        const active = state.modelDefault === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className={[
              'block w-full rounded-md border bg-card p-4 text-left transition-colors',
              active ? 'border-primary' : 'border-border hover:border-foreground/30',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">{c.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.label}</span>
                  {c.recommended && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.subtitle}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { useReducer, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  buildConfig,
  initialOnboardingState,
  onboardingReducer,
  type OnboardingState,
  type OnboardingStep,
} from './reducer';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEP_ORDER: OnboardingStep[] = [
  'vault',
  'provider',
  'model',
  'calendar',
  'tavily',
  'indexing',
  'done',
];

const STEP_TITLES: Record<OnboardingStep, { title: string; subtitle: string }> = {
  vault: {
    title: 'Where does your vault live?',
    subtitle: 'Pick a folder of markdown notes. Sanji will index it and stay in sync.',
  },
  provider: {
    title: 'Which Claude do you want to use?',
    subtitle: 'Use your existing Claude subscription or paste an Anthropic API key.',
  },
  model: {
    title: 'Pick a default model.',
    subtitle: 'Sonnet for most things; Opus when you want extra horsepower.',
  },
  calendar: {
    title: 'Add a calendar (optional).',
    subtitle: 'Sanji can read iCal feeds for daily planning. You can add more later.',
  },
  tavily: {
    title: 'Tavily web search (optional).',
    subtitle: 'Paste a key for /research-style web grounding. Skip if you only want vault access.',
  },
  indexing: {
    title: 'Indexing your notes…',
    subtitle: 'Embeddings build in the background. You can start chatting after the first 100 notes.',
  },
  done: {
    title: 'You\'re set.',
    subtitle: 'Sanji is ready. Open the chat to start.',
  },
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const { title, subtitle } = STEP_TITLES[state.step];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-[12vh]">
        <ProgressDots step={state.step} />

        <h1 className="mt-6 text-3xl font-semibold leading-tight">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>

        <div className="mt-8 flex-1">
          <StepBody state={state} />
        </div>

        <div className="mt-10 mb-12 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: 'back' })}
            disabled={state.step === 'vault'}
          >
            Back
          </Button>
          {state.step === 'done' ? (
            <Button onClick={onComplete}>Open Sanji</Button>
          ) : (
            <Button onClick={() => dispatch({ type: 'next' })}>Continue</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressDots({ step }: { step: OnboardingStep }) {
  const idx = STEP_ORDER.indexOf(step);
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${idx + 1} of ${STEP_ORDER.length}`}>
      {STEP_ORDER.map((s, i) => (
        <span
          key={s}
          className={[
            'h-1.5 rounded-full transition-all',
            i === idx ? 'w-6 bg-primary' : i < idx ? 'w-1.5 bg-foreground/40' : 'w-1.5 bg-muted-foreground/30',
          ].join(' ')}
          aria-hidden
        />
      ))}
    </div>
  );
}

function StepBody({ state }: { state: OnboardingState }): ReactNode {
  // Placeholder content; T17 fills these in with real step components.
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
      Step <span className="font-mono text-foreground">{state.step}</span> body — T17 lands the
      actual {state.step} step component. Reducer state is wired; Continue and Back buttons drive
      the state machine.
      {state.step === 'done' && (
        <div className="mt-3 font-mono text-xs text-muted-foreground/80">
          buildConfig output: {JSON.stringify(buildConfig(state))}
        </div>
      )}
    </div>
  );
}

import { useReducer, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  initialOnboardingState,
  onboardingReducer,
  type OnboardingState,
  type OnboardingStep,
} from './reducer';
import { VaultStep } from './steps/VaultStep';
import { ProviderStep } from './steps/ProviderStep';
import { IndexingStep } from './steps/IndexingStep';
import { DoneStep } from './steps/DoneStep';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEP_ORDER: OnboardingStep[] = ['vault', 'provider', 'indexing', 'done'];

const STEP_TITLES: Record<OnboardingStep, { title: string; subtitle: string }> = {
  vault: {
    title: 'Where does your vault live?',
    subtitle: 'Pick a folder of markdown notes. Sanji will index it and stay in sync.',
  },
  provider: {
    title: 'Which Claude do you want to use?',
    subtitle: 'Use your existing Claude subscription or paste an Anthropic API key.',
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
          <StepBody state={state} dispatch={dispatch} />
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

interface StepBodyProps {
  state: OnboardingState;
  dispatch: React.Dispatch<Parameters<typeof onboardingReducer>[1]>;
}

function StepBody({ state, dispatch }: StepBodyProps): ReactNode {
  const props = { state, dispatch };
  switch (state.step) {
    case 'vault':
      return <VaultStep {...props} />;
    case 'provider':
      return <ProviderStep {...props} />;
    case 'indexing':
      return <IndexingStep {...props} />;
    case 'done':
      return <DoneStep {...props} />;
  }
}

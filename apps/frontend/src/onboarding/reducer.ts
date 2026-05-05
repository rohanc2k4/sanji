import type { ConfigDto, ProviderTestResult, VaultValidateResult } from '@sanji/shared';

export type OnboardingStep =
  | 'vault'
  | 'provider'
  | 'model'
  | 'calendar'
  | 'tavily'
  | 'indexing'
  | 'done';

export interface OnboardingState {
  step: OnboardingStep;
  vault: string;
  vaultValidation: VaultValidateResult | null;
  providerMode: 'claude-code' | 'anthropic-api';
  anthropicApiKey: string;
  providerTestResult: ProviderTestResult | null;
  modelDefault: string;
  modelHeavy: string;
  calendarUrls: Array<{ label: string; url: string }>;
  tavilyKey: string;
  indexedNotes: number;
  totalNotes: number;
  error: string | null;
}

export const initialOnboardingState: OnboardingState = {
  step: 'vault',
  vault: '',
  vaultValidation: null,
  providerMode: 'claude-code',
  anthropicApiKey: '',
  providerTestResult: null,
  modelDefault: 'claude-sonnet-4-6',
  modelHeavy: 'claude-opus-4-7',
  calendarUrls: [],
  tavilyKey: '',
  indexedNotes: 0,
  totalNotes: 0,
  error: null,
};

export type OnboardingAction =
  | { type: 'set-vault'; vault: string; validation: VaultValidateResult }
  | {
      type: 'set-provider';
      mode: 'claude-code' | 'anthropic-api';
      anthropicApiKey?: string;
      testResult: ProviderTestResult;
    }
  | { type: 'set-model'; defaultModel: string; heavyModel: string }
  | { type: 'add-calendar-url'; url: { label: string; url: string } }
  | { type: 'remove-calendar-url'; index: number }
  | { type: 'set-tavily'; key: string }
  | { type: 'index-progress'; done: number; total: number }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'set-error'; message: string | null };

const ORDER: OnboardingStep[] = [
  'vault',
  'provider',
  'model',
  'calendar',
  'tavily',
  'indexing',
  'done',
];
const SKIPPABLE: ReadonlySet<OnboardingStep> = new Set(['calendar', 'tavily']);

function canAdvance(state: OnboardingState): boolean {
  if (SKIPPABLE.has(state.step)) return true;
  switch (state.step) {
    case 'vault':
      return state.vaultValidation?.ok === true;
    case 'provider':
      return state.providerTestResult?.ok === true;
    case 'model':
      return state.modelDefault !== '';
    case 'indexing':
      return state.totalNotes > 0 && state.indexedNotes >= state.totalNotes;
    case 'done':
      return false;
    case 'calendar':
    case 'tavily':
      return true;
  }
}

export function onboardingReducer(s: OnboardingState, a: OnboardingAction): OnboardingState {
  switch (a.type) {
    case 'set-vault':
      return { ...s, vault: a.vault, vaultValidation: a.validation };
    case 'set-provider':
      return {
        ...s,
        providerMode: a.mode,
        anthropicApiKey: a.anthropicApiKey ?? '',
        providerTestResult: a.testResult,
      };
    case 'set-model':
      return { ...s, modelDefault: a.defaultModel, modelHeavy: a.heavyModel };
    case 'add-calendar-url':
      return { ...s, calendarUrls: [...s.calendarUrls, a.url] };
    case 'remove-calendar-url':
      return {
        ...s,
        calendarUrls: s.calendarUrls.filter((_, i) => i !== a.index),
      };
    case 'set-tavily':
      return { ...s, tavilyKey: a.key };
    case 'index-progress':
      return { ...s, indexedNotes: a.done, totalNotes: a.total };
    case 'set-error':
      return { ...s, error: a.message };
    case 'next': {
      if (!canAdvance(s)) return s;
      const i = ORDER.indexOf(s.step);
      const nextStep = ORDER[Math.min(i + 1, ORDER.length - 1)]!;
      return { ...s, step: nextStep };
    }
    case 'back': {
      const i = ORDER.indexOf(s.step);
      const prevStep = ORDER[Math.max(i - 1, 0)]!;
      return { ...s, step: prevStep };
    }
  }
}

export function buildConfig(s: OnboardingState): ConfigDto {
  const provider: ConfigDto['provider'] = { mode: s.providerMode };
  if (s.anthropicApiKey) provider.anthropicApiKey = s.anthropicApiKey;
  return {
    provider,
    models: { default: s.modelDefault, heavy: s.modelHeavy },
    calendar: { urls: s.calendarUrls, pollIntervalMinutes: 5 },
    search: { tavilyApiKey: s.tavilyKey },
    indexing: {
      chunkSizeTokens: 500,
      chunkOverlapTokens: 50,
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    },
    ui: { theme: 'auto', mascot: 'chatty' },
  };
}

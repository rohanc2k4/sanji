import type { ConfigDto, ProviderTestResult, VaultValidateResult, ClaudeCliCheckResult } from '@sanji/shared';

// Calendar + tavily steps are scoped for v0.3 (planning rituals: /daily,
// /research, web_search). v0.1 onboarding ships with just the study-buddy
// path: vault → provider → indexing → done. The model step was removed
// 2026-05-07: the chat header now exposes a per-conversation model picker,
// so onboarding no longer asks the user to pick one upfront. modelDefault
// and modelHeavy still carry their hard-coded defaults into the saved
// config so the backend has both rungs of the ladder available. The
// backend config schema also keeps `calendar` and `search` entries with
// empty defaults so v0.3 can re-add the steps without backend churn.
export type OnboardingStep =
  | 'vault'
  | 'provider'
  | 'indexing'
  | 'done';

export interface OnboardingState {
  step: OnboardingStep;
  vault: string;
  vaultValidation: VaultValidateResult | null;
  providerMode: 'claude-code' | 'anthropic-api';
  anthropicApiKey: string;
  providerTestResult: ProviderTestResult | null;
  cliCheck?: ClaudeCliCheckResult;
  modelDefault: string;
  modelHeavy: string;
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
  | { type: 'set-cli-check'; result: ClaudeCliCheckResult }
  | { type: 'clear-cli-check' }
  | { type: 'index-progress'; done: number; total: number }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'set-error'; message: string | null };

export const ORDER: OnboardingStep[] = ['vault', 'provider', 'indexing', 'done'];

function canAdvance(state: OnboardingState): boolean {
  switch (state.step) {
    case 'vault':
      return state.vaultValidation?.ok === true;
    case 'provider':
      return state.providerTestResult?.ok === true;
    case 'indexing':
      return state.totalNotes > 0 && state.indexedNotes >= state.totalNotes;
    case 'done':
      return false;
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
    case 'set-cli-check':
      return { ...s, cliCheck: a.result };
    case 'clear-cli-check': {
      const { cliCheck: _drop, ...rest } = s;
      return rest as OnboardingState;
    }
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
    calendar: { urls: [], pollIntervalMinutes: 5 },
    search: { tavilyApiKey: '' },
    indexing: {
      chunkSizeTokens: 500,
      chunkOverlapTokens: 50,
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    },
    ingestion: { contextualRetrieval: false },
    ui: { theme: 'auto', mascot: 'chatty' },
    chat: { autoClearThreshold: 0.75, autoClearIdleMinutes: 30 },
  };
}

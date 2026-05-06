import { describe, expect, it } from 'vitest';
import {
  buildConfig,
  initialOnboardingState,
  onboardingReducer,
  type OnboardingState,
} from './reducer.js';

describe('onboardingReducer', () => {
  it('starts at vault step with empty selections', () => {
    expect(initialOnboardingState.step).toBe('vault');
    expect(initialOnboardingState.vault).toBe('');
    expect(initialOnboardingState.vaultValidation).toBeNull();
    expect(initialOnboardingState.providerTestResult).toBeNull();
  });

  it('set-vault stores path + validation', () => {
    const s = onboardingReducer(initialOnboardingState, {
      type: 'set-vault',
      vault: '/x',
      validation: { ok: true, noteCount: 5, hasExisting: false },
    });
    expect(s.vault).toBe('/x');
    expect(s.vaultValidation?.ok).toBe(true);
    expect(s.vaultValidation?.noteCount).toBe(5);
  });

  it('next from vault → provider only when validation is ok', () => {
    let s = onboardingReducer(initialOnboardingState, {
      type: 'set-vault',
      vault: '/x',
      validation: { ok: true, noteCount: 5, hasExisting: false },
    });
    s = onboardingReducer(s, { type: 'next' });
    expect(s.step).toBe('provider');
  });

  it('next from vault is a no-op when validation fails', () => {
    let s = onboardingReducer(initialOnboardingState, {
      type: 'set-vault',
      vault: '/bogus',
      validation: { ok: false, noteCount: 0, hasExisting: false, reason: 'nope' },
    });
    s = onboardingReducer(s, { type: 'next' });
    expect(s.step).toBe('vault');
  });

  it('next from provider requires providerTestResult.ok', () => {
    const base: OnboardingState = { ...initialOnboardingState, step: 'provider' };
    let s = onboardingReducer(base, { type: 'next' });
    expect(s.step).toBe('provider');
    s = onboardingReducer(base, {
      type: 'set-provider',
      mode: 'claude-code',
      testResult: { ok: true },
    });
    s = onboardingReducer(s, { type: 'next' });
    expect(s.step).toBe('model');
  });

  it('next from model requires modelDefault, then advances to indexing', () => {
    const noModel: OnboardingState = {
      ...initialOnboardingState,
      step: 'model',
      modelDefault: '',
    };
    expect(onboardingReducer(noModel, { type: 'next' }).step).toBe('model');
    const withModel: OnboardingState = { ...noModel, modelDefault: 'claude-sonnet-4-6' };
    expect(onboardingReducer(withModel, { type: 'next' }).step).toBe('indexing');
  });

  it('next from indexing requires complete progress', () => {
    const half: OnboardingState = {
      ...initialOnboardingState,
      step: 'indexing',
      totalNotes: 10,
      indexedNotes: 4,
    };
    expect(onboardingReducer(half, { type: 'next' }).step).toBe('indexing');
    const all: OnboardingState = { ...half, indexedNotes: 10 };
    expect(onboardingReducer(all, { type: 'next' }).step).toBe('done');
  });

  it('back never goes below vault', () => {
    const s = onboardingReducer(initialOnboardingState, { type: 'back' });
    expect(s.step).toBe('vault');
  });

  it('back from provider → vault', () => {
    const s: OnboardingState = { ...initialOnboardingState, step: 'provider' };
    expect(onboardingReducer(s, { type: 'back' }).step).toBe('vault');
  });

  it('index-progress sets done + total', () => {
    const s = onboardingReducer(initialOnboardingState, {
      type: 'index-progress',
      done: 3,
      total: 10,
    });
    expect(s.indexedNotes).toBe(3);
    expect(s.totalNotes).toBe(10);
  });

  it('set-error stores and clears', () => {
    const set = onboardingReducer(initialOnboardingState, {
      type: 'set-error',
      message: 'boom',
    });
    expect(set.error).toBe('boom');
    const clear = onboardingReducer(set, { type: 'set-error', message: null });
    expect(clear.error).toBeNull();
  });
});

describe('buildConfig', () => {
  it('produces a ConfigDto from a filled state with empty calendar + search defaults', () => {
    const filled: OnboardingState = {
      ...initialOnboardingState,
      step: 'indexing',
      vault: '/v',
      vaultValidation: { ok: true, noteCount: 1, hasExisting: false },
      providerMode: 'claude-code',
      providerTestResult: { ok: true },
      modelDefault: 'claude-sonnet-4-6',
      modelHeavy: 'claude-opus-4-7',
    };
    const cfg = buildConfig(filled);
    expect(cfg.provider.mode).toBe('claude-code');
    expect(cfg.provider.anthropicApiKey).toBeUndefined();
    expect(cfg.models.default).toBe('claude-sonnet-4-6');
    expect(cfg.models.heavy).toBe('claude-opus-4-7');
    // Calendar + tavily ship empty in v0.1; v0.3 fills them when the planning
    // rituals (calendar fetcher + /research) come back online.
    expect(cfg.calendar.urls).toHaveLength(0);
    expect(cfg.calendar.pollIntervalMinutes).toBe(5);
    expect(cfg.search.tavilyApiKey).toBe('');
    expect(cfg.indexing.embeddingModel).toBe('Xenova/all-MiniLM-L6-v2');
    expect(cfg.ui.theme).toBe('auto');
  });

  it('includes anthropicApiKey only when set under anthropic-api mode', () => {
    const apiState: OnboardingState = {
      ...initialOnboardingState,
      providerMode: 'anthropic-api',
      anthropicApiKey: 'sk-test',
    };
    expect(buildConfig(apiState).provider.anthropicApiKey).toBe('sk-test');
    const empty: OnboardingState = { ...apiState, anthropicApiKey: '' };
    expect(buildConfig(empty).provider.anthropicApiKey).toBeUndefined();
  });
});

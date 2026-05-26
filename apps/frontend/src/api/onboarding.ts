import type {
  ConfigDto,
  ProviderTestResult,
  VaultValidateResult,
  OnboardingInitRequest,
  ClaudeCliCheckResult,
} from '@sanji/shared';
import { apiFetch } from './client.js';

export const validateVault = (vault: string) =>
  apiFetch<VaultValidateResult>('/api/onboarding/validate-vault', {
    method: 'POST',
    body: JSON.stringify({ vault }),
  });

export const testProvider = (provider: ConfigDto['provider']) =>
  apiFetch<ProviderTestResult>('/api/onboarding/test-provider', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });

export const initOnboarding = (req: OnboardingInitRequest) =>
  apiFetch<ConfigDto>('/api/onboarding/init', {
    method: 'POST',
    body: JSON.stringify(req),
  });

export const checkClaudeCli = () =>
  apiFetch<ClaudeCliCheckResult>('/api/onboarding/check-claude-cli', {
    method: 'POST',
    body: '{}',
  });

import type { Config, ProviderAdapter } from '@sanji/shared';
import { AnthropicApiAdapter } from './anthropic-api.js';
import { ClaudeCodeSDKAdapter } from './claude-code-sdk.js';

export function makeAdapter(cfg: Config): ProviderAdapter {
  if (cfg.provider.mode === 'anthropic-api') {
    return new AnthropicApiAdapter(cfg.provider.anthropic_api.api_key);
  }
  return new ClaudeCodeSDKAdapter();
}

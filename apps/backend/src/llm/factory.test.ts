import { describe, expect, it } from 'vitest';
import { parseConfig } from '@sanji/shared';
import { makeAdapter } from './factory.js';
import { ClaudeCodeSDKAdapter } from './claude-code-sdk.js';
import { AnthropicApiAdapter } from './anthropic-api.js';

describe('makeAdapter', () => {
  it('returns ClaudeCodeSDKAdapter when mode is claude-code', () => {
    const cfg = parseConfig('[provider]\nmode = "claude-code"\n');
    expect(makeAdapter(cfg)).toBeInstanceOf(ClaudeCodeSDKAdapter);
  });

  it('returns AnthropicApiAdapter when mode is anthropic-api', () => {
    const cfg = parseConfig(
      '[provider]\nmode = "anthropic-api"\n[provider.anthropic_api]\napi_key = "sk-ant-test"\n',
    );
    expect(makeAdapter(cfg)).toBeInstanceOf(AnthropicApiAdapter);
  });
});

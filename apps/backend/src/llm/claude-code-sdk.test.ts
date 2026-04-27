import { describe, expect, it, vi } from 'vitest';

vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  return {
    query: () =>
      (async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: 'hi from sdk' }] } };
        yield { type: 'result', subtype: 'success', usage: { input_tokens: 1, output_tokens: 2 } };
      })(),
  };
});

import { ClaudeCodeSDKAdapter } from './claude-code-sdk.js';

describe('ClaudeCodeSDKAdapter', () => {
  it('streams a text delta and a message_stop', async () => {
    const a = new ClaudeCodeSDKAdapter();
    const events: unknown[] = [];
    for await (const e of a.chat({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'hi' }] })) {
      events.push(e);
    }
    expect(events).toContainEqual({ type: 'text_delta', text: 'hi from sdk' });
    expect((events.at(-1) as any).type).toBe('message_stop');
  });
});

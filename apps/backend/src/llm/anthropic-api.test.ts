import { describe, expect, it } from 'vitest';
import { AnthropicApiAdapter } from './anthropic-api.js';

class FakeStream implements AsyncIterable<unknown> {
  // Mirrors @anthropic-ai/sdk message-stream events shape
  async *[Symbol.asyncIterator]() {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hello ' } };
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } };
    yield { type: 'message_delta', usage: { input_tokens: 3, output_tokens: 2 } };
    yield { type: 'message_stop' };
  }
}

const fakeClient = {
  messages: {
    stream: () => new FakeStream(),
    create: async () => ({ content: [{ type: 'text', text: 'pong' }] }),
  },
} as any;

describe('AnthropicApiAdapter', () => {
  it('streams text deltas and a final message_stop with usage', async () => {
    const a = new AnthropicApiAdapter('sk-ant-test', fakeClient);
    const events: unknown[] = [];
    for await (const e of a.chat({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'hi' }] })) {
      events.push(e);
    }
    expect(events).toEqual([
      { type: 'text_delta', text: 'hello ' },
      { type: 'text_delta', text: 'world' },
      { type: 'message_stop', usage: { input: 3, output: 2 } },
    ]);
  });

  it('reports credentials missing when key is empty', async () => {
    const a = new AnthropicApiAdapter('', fakeClient);
    const r = await a.testCredentials();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/api[_ ]key/i);
  });

  it('reports credentials ok when client.create succeeds', async () => {
    const a = new AnthropicApiAdapter('sk-ant-test', fakeClient);
    const r = await a.testCredentials();
    expect(r.ok).toBe(true);
  });

  it('returns the canonical model list', async () => {
    const a = new AnthropicApiAdapter('sk-ant-test', fakeClient);
    const models = await a.getAvailableModels();
    expect(models.find((m) => m.id === 'claude-sonnet-4-6')).toBeTruthy();
    expect(models.find((m) => m.id === 'claude-opus-4-7')).toBeTruthy();
  });
});

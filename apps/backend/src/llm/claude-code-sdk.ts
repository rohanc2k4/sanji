import { query } from '@anthropic-ai/claude-agent-sdk';
import type { ChatEvent, ChatOpts, ModelInfo, ProviderAdapter } from '@sanji/shared';

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7 (subscription)' },
  { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6 (subscription)' },
  { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5 (subscription)' },
];

export class ClaudeCodeSDKAdapter implements ProviderAdapter {
  // NOTE: single-turn only. The underlying query() API takes one prompt, so
  // prior conversation turns in opts.messages are dropped — only the most
  // recent user message is forwarded.
  async *chat(opts: ChatOpts): AsyncIterable<ChatEvent> {
    const lastUser = [...opts.messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      yield { type: 'error', message: 'no user message' };
      return;
    }
    const stream = query({
      prompt: lastUser.content,
      options: { model: opts.model, systemPrompt: opts.system },
    });

    let usage: { input: number; output: number } | undefined;
    for await (const msg of stream as AsyncIterable<any>) {
      if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
        for (const block of msg.message.content) {
          if (block.type === 'text') yield { type: 'text_delta', text: block.text as string };
        }
      } else if (msg.type === 'result' && msg.usage) {
        usage = { input: msg.usage.input_tokens, output: msg.usage.output_tokens };
      }
    }
    yield { type: 'message_stop', usage };
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return KNOWN_MODELS;
  }

  async testCredentials(): Promise<{ ok: boolean; reason?: string }> {
    try {
      const stream = query({ prompt: 'ping', options: { model: 'claude-haiku-4-5-20251001' } });
      for await (const _ of stream as AsyncIterable<unknown>) break;
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }
}

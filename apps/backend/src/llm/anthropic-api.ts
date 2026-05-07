import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatEvent,
  ChatOpts,
  ModelInfo,
  OneShotOpts,
  ProviderAdapter,
} from '@sanji/shared';

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7' },
  { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5' },
];

export class AnthropicApiAdapter implements ProviderAdapter {
  constructor(
    private apiKey: string,
    private client: Anthropic = new Anthropic({ apiKey }),
  ) {}

  async *chat(opts: ChatOpts): AsyncIterable<ChatEvent> {
    const stream = this.client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: opts.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content })),
    } as Anthropic.MessageStreamParams);

    let usage: { input: number; output: number } | undefined;
    for await (const ev of stream as AsyncIterable<any>) {
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        yield { type: 'text_delta', text: ev.delta.text as string };
      } else if (ev.type === 'message_delta' && ev.usage) {
        usage = { input: ev.usage.input_tokens, output: ev.usage.output_tokens };
      } else if (ev.type === 'message_stop') {
        yield { type: 'message_stop', usage };
      }
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return KNOWN_MODELS;
  }

  async oneShot(opts: OneShotOpts): Promise<string> {
    // NOTE: prompt caching intentionally not wired on this branch. SDK 0.32.1
    // exposes caching only under `client.beta.promptCaching.messages.create`
    // (with `PromptCachingBetaTextBlockParam`), and the standard
    // `messages.create` `TextBlockParam` does NOT accept `cache_control`.
    // Attaching it to the standard call would either 400 or be silently
    // dropped. We drop the `s.cache` hint here and pay full per-chunk cost
    // when contextual retrieval is enabled. v0.2 backlog: route through
    // `client.beta.promptCaching.messages.create` (or the SDK's native
    // `cache_control` support once it lands on the standard API) so the
    // parent-document segment is cached across chunks of the same note.
    const content: Array<{ type: 'text'; text: string }> = opts.segments.map((s) => ({
      type: 'text',
      text: s.text,
    }));
    const resp = await this.client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 256,
      temperature: opts.temperature ?? 0,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: content as unknown as Anthropic.TextBlockParam[] }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    const first = resp.content.find((b: Anthropic.ContentBlock) => b.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;
    return first?.text ?? '';
  }

  async testCredentials(): Promise<{ ok: boolean; reason?: string }> {
    if (!this.apiKey) return { ok: false, reason: 'api_key not set' };
    try {
      await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }
}

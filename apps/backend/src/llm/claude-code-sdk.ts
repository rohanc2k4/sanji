import { z } from 'zod';
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type {
  ChatEvent,
  ChatMessage,
  ChatOpts,
  ChatTool,
  ModelInfo,
  OneShotOpts,
  ProviderAdapter,
} from '@sanji/shared';

/**
 * Render the prior conversation turns + the latest user message into a single
 * prompt string for the Claude Agent SDK's `query()` API.
 *
 * Why this exists: SDK 0.1.77's `query({ prompt, ... })` accepts either a string
 * or an `AsyncIterable<SDKUserMessage>`. The streaming variant is for follow-up
 * user turns within a live session, NOT for replaying prior assistant turns —
 * there is no `SDKAssistantMessage` input shape. So to preserve multi-turn
 * memory on the subscription path we serialize the history as a structured
 * text prefix to the latest user message.
 *
 * v0.2 todo: switch to a native multi-turn API if/when the Claude Agent SDK
 * exposes one (e.g. `query({ messages: [...] })` or session resume).
 */
export function renderPromptForClaudeCodeSDK(messages: ChatMessage[]): string {
  const lastUser = messages[messages.length - 1];
  if (!lastUser) return '';
  const prior = messages.slice(0, -1).filter((m) => m.role !== 'system');
  if (prior.length === 0) return lastUser.content;

  const turns = prior
    .map((m) => `<turn role="${m.role}">\n${m.content}\n</turn>`)
    .join('\n');
  return `<conversation_history>\n${turns}\n</conversation_history>\n\n${lastUser.content}`;
}

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7 (subscription)' },
  { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6 (subscription)' },
  { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5 (subscription)' },
];

export class ClaudeCodeSDKAdapter implements ProviderAdapter {
  // Multi-turn support: the SDK's query() prompt parameter is single-string or
  // an AsyncIterable of user-only messages, so prior assistant turns cannot be
  // replayed natively. We serialize history into the prompt via
  // renderPromptForClaudeCodeSDK() so follow-ups resolve against earlier turns.
  async *chat(opts: ChatOpts): AsyncIterable<ChatEvent> {
    const last = opts.messages[opts.messages.length - 1];
    if (!last || last.role !== 'user') {
      yield { type: 'error', message: 'last message must be a user message' };
      return;
    }

    const promptText = renderPromptForClaudeCodeSDK(opts.messages);

    const hasTools = !!(opts.tools && opts.tools.length > 0 && opts.toolHandler);
    const mcpServers = hasTools
      ? { 'sanji-tools': buildMcpServer(opts.tools!, opts.toolHandler!) }
      : undefined;
    const allowedTools = hasTools
      ? opts.tools!.map((t) => `mcp__sanji-tools__${t.name}`)
      : undefined;

    // Bridge the caller-supplied AbortSignal into the SDK's AbortController-based
    // cancellation. SDK 0.1.77's `Options.abortController` is the only way to
    // make `query()` exit promptly once the client disconnects — without this,
    // cancelling an ingest leaves the underlying SDK call (and any tool work)
    // running until natural completion, blocking the sequential ingest queue
    // and continuing provider work after the user has abandoned the request.
    const sdkController = new AbortController();
    const onAbort = () => sdkController.abort();
    if (opts.signal) {
      if (opts.signal.aborted) sdkController.abort();
      else opts.signal.addEventListener('abort', onAbort, { once: true });
    }

    const stream = query({
      prompt: promptText,
      options: {
        model: opts.model,
        systemPrompt: opts.system,
        abortController: sdkController,
        ...(mcpServers ? { mcpServers } : {}),
        ...(allowedTools ? { allowedTools, permissionMode: 'bypassPermissions' as const } : {}),
      },
    });

    let usage: { input: number; output: number } | undefined;
    try {
      for await (const msg of stream as AsyncIterable<any>) {
        if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              yield { type: 'text_delta', text: block.text as string };
            } else if (block.type === 'tool_use') {
              yield {
                type: 'tool_use_complete',
                id: block.id as string,
                name: block.name as string,
                input: (block.input ?? {}) as Record<string, unknown>,
              };
            }
          }
        } else if (msg.type === 'user' && Array.isArray(msg.message?.content)) {
          for (const block of msg.message.content) {
            if (block.type === 'tool_result') {
              yield {
                type: 'tool_result',
                id: block.tool_use_id as string,
                content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                isError: block.is_error === true,
              };
            }
          }
        } else if (msg.type === 'result' && msg.usage) {
          usage = { input: msg.usage.input_tokens, output: msg.usage.output_tokens };
        }
      }
    } catch (err) {
      // The SDK throws AbortError once `sdkController.abort()` fires. That
      // is the expected termination path for caller-driven cancellation;
      // surface it as a clean stream end rather than an error so the
      // sequential ingest queue can drain the next job.
      if (sdkController.signal.aborted) {
        // fall through to message_stop with whatever usage we collected
      } else {
        throw err;
      }
    } finally {
      if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
    }
    yield { type: 'message_stop', usage };
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return KNOWN_MODELS;
  }

  /**
   * NOTE: the Claude Code SDK does not currently expose cache_control on
   * prompt content blocks; the `cache` flag on segments is ignored on this
   * path. Anthropic API path keeps caching. The blurb call still works, just
   * at a higher per-call cost on subscription auth.
   */
  async oneShot(opts: OneShotOpts): Promise<string> {
    const prompt = opts.segments.map((s) => s.text).join('\n\n');
    const stream = query({
      prompt,
      options: {
        model: opts.model,
        ...(opts.system ? { systemPrompt: opts.system } : {}),
      },
    });
    let out = '';
    for await (const msg of stream as AsyncIterable<any>) {
      if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
        for (const block of msg.message.content) {
          if (block.type === 'text') out += block.text as string;
        }
      } else if (msg.type === 'result') {
        break;
      }
    }
    return out;
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

function buildMcpServer(
  tools: readonly ChatTool[],
  handler: (name: string, input: Record<string, unknown>) => Promise<string>,
) {
  const sdkTools = tools.map((t) =>
    tool(
      t.name,
      t.description,
      toZodShape(t.input_schema),
      async (args: Record<string, unknown>, _extra: unknown) => {
        const result = await handler(t.name, args);
        return { content: [{ type: 'text' as const, text: result }] };
      },
    ),
  );
  return createSdkMcpServer({ name: 'sanji-tools', version: '0.0.1', tools: sdkTools });
}

function toZodShape(schema: ChatTool['input_schema']): Record<string, z.ZodTypeAny> {
  const required = new Set(schema.required ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, raw] of Object.entries(schema.properties ?? {})) {
    const prop = raw as { type?: string; description?: string };
    let zod: z.ZodTypeAny;
    switch (prop.type) {
      case 'string':
        zod = z.string();
        break;
      case 'number':
      case 'integer':
        zod = z.number();
        break;
      case 'boolean':
        zod = z.boolean();
        break;
      default:
        // Nested objects and arrays are not yet mapped; the model sees them as
        // untyped here. The schema description still flows through via t.description,
        // and runtime validation happens at the tool's own validate*() functions.
        zod = z.unknown();
    }
    if (prop.description) zod = zod.describe(prop.description);
    shape[key] = required.has(key) ? zod : zod.optional();
  }
  return shape;
}

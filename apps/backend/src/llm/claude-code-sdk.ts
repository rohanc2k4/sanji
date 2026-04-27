import { z } from 'zod';
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { ChatEvent, ChatOpts, ChatTool, ModelInfo, ProviderAdapter } from '@sanji/shared';

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

    const hasTools = !!(opts.tools && opts.tools.length > 0 && opts.toolHandler);
    const mcpServers = hasTools
      ? { 'sanji-tools': buildMcpServer(opts.tools!, opts.toolHandler!) }
      : undefined;
    const allowedTools = hasTools
      ? opts.tools!.map((t) => `mcp__sanji-tools__${t.name}`)
      : undefined;

    const stream = query({
      prompt: lastUser.content,
      options: {
        model: opts.model,
        systemPrompt: opts.system,
        ...(mcpServers ? { mcpServers } : {}),
        ...(allowedTools ? { allowedTools, permissionMode: 'bypassPermissions' as const } : {}),
      },
    });

    let usage: { input: number; output: number } | undefined;
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
        zod = z.unknown();
    }
    if (prop.description) zod = zod.describe(prop.description);
    shape[key] = required.has(key) ? zod : zod.optional();
  }
  return shape;
}

import { describe, expect, it, vi } from 'vitest';

vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  const tool = (def: unknown, _impl: unknown) => ({ ...(def as object), kind: 'sdk-tool' });
  const createSdkMcpServer = (def: { name: string; tools: unknown[] }) => ({
    kind: 'sdk-mcp-server',
    ...def,
  });
  const query = (_args: unknown) =>
    (async function* () {
      yield { type: 'assistant', message: { content: [{ type: 'text', text: 'tools-aware hi' }] } };
      yield { type: 'result', subtype: 'success', usage: { input_tokens: 1, output_tokens: 2 } };
    })();
  return { tool, createSdkMcpServer, query };
});

import { ClaudeCodeSDKAdapter } from './claude-code-sdk.js';

describe('ClaudeCodeSDKAdapter', () => {
  it('streams a text delta and a message_stop (no tools)', async () => {
    const a = new ClaudeCodeSDKAdapter();
    const events: unknown[] = [];
    for await (const e of a.chat({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'hi' }] })) {
      events.push(e);
    }
    expect(events).toContainEqual({ type: 'text_delta', text: 'tools-aware hi' });
    expect((events.at(-1) as any).type).toBe('message_stop');
  });

  it('accepts tools via ChatOpts and forwards them to the SDK', async () => {
    const a = new ClaudeCodeSDKAdapter();
    const tools = [
      {
        name: 'echo',
        description: 'echo input',
        input_schema: { type: 'object' as const, properties: { msg: { type: 'string' } } },
      },
    ];
    const events: unknown[] = [];
    for await (const e of a.chat({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: 'hi' }],
      tools,
      toolHandler: async () => 'mocked-result',
    })) {
      events.push(e);
    }
    expect(events.find((e: any) => e.type === 'text_delta')).toBeTruthy();
  });

  it('accepts tools with multi-field schemas (string + optional number)', async () => {
    const a = new ClaudeCodeSDKAdapter();
    const events: unknown[] = [];
    for await (const e of a.chat({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: 'hi' }],
      tools: [
        {
          name: 'search_vault',
          description: 'FTS5 keyword search',
          input_schema: {
            type: 'object' as const,
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' },
            },
            required: ['query'],
          },
        },
      ],
      toolHandler: async () => 'ok',
    })) {
      events.push(e);
    }
    expect(events.find((e: any) => e.type === 'text_delta')).toBeTruthy();
  });
});

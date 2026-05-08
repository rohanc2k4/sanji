import { describe, expect, it, vi } from 'vitest';

const queryCalls: Array<{ prompt: unknown; options: unknown }> = [];

vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  const tool = (def: unknown, _impl: unknown) => ({ ...(def as object), kind: 'sdk-tool' });
  const createSdkMcpServer = (def: { name: string; tools: unknown[] }) => ({
    kind: 'sdk-mcp-server',
    ...def,
  });
  const query = (args: { prompt: unknown; options: unknown }) => {
    queryCalls.push({ prompt: args.prompt, options: args.options });
    return (async function* () {
      yield { type: 'assistant', message: { content: [{ type: 'text', text: 'tools-aware hi' }] } };
      yield { type: 'result', subtype: 'success', usage: { input_tokens: 1, output_tokens: 2 } };
    })();
  };
  return { tool, createSdkMcpServer, query };
});

import { ClaudeCodeSDKAdapter, renderPromptForClaudeCodeSDK } from './claude-code-sdk.js';

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

  it('forwards full conversation history to query() (multi-turn memory)', async () => {
    queryCalls.length = 0;
    const a = new ClaudeCodeSDKAdapter();
    const events: unknown[] = [];
    for await (const e of a.chat({
      model: 'claude-sonnet-4-6',
      messages: [
        { role: 'user', content: 'first-question-marker' },
        { role: 'assistant', content: 'first-answer-marker' },
        { role: 'user', content: 'second-question-marker' },
      ],
    })) {
      events.push(e);
    }
    expect(queryCalls.length).toBe(1);
    const prompt = queryCalls[0]!.prompt as string;
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('first-question-marker');
    expect(prompt).toContain('first-answer-marker');
    expect(prompt).toContain('second-question-marker');
  });

  it('passes only the user content unchanged when there is no history', async () => {
    queryCalls.length = 0;
    const a = new ClaudeCodeSDKAdapter();
    for await (const _ of a.chat({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: 'solo-question' }],
    })) {
      // drain
    }
    expect(queryCalls[0]!.prompt).toBe('solo-question');
  });
});

describe('renderPromptForClaudeCodeSDK', () => {
  it('returns the lone user message verbatim', () => {
    expect(renderPromptForClaudeCodeSDK([{ role: 'user', content: 'hi' }])).toBe('hi');
  });

  it('serializes prior turns and appends the latest user message', () => {
    const out = renderPromptForClaudeCodeSDK([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
      { role: 'user', content: 'C' },
    ]);
    expect(out).toContain('<conversation_history>');
    expect(out).toContain('<turn role="user">\nA\n</turn>');
    expect(out).toContain('<turn role="assistant">\nB\n</turn>');
    expect(out.endsWith('C')).toBe(true);
  });

  it('drops system messages from the prior-turn block', () => {
    const out = renderPromptForClaudeCodeSDK([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
      { role: 'user', content: 'C' },
    ]);
    expect(out).not.toContain('SYS');
    expect(out).toContain('A');
    expect(out).toContain('B');
    expect(out.endsWith('C')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { runAgent, type AgentDependencies } from './run.js';
import type { Skill } from '../skills/parse.js';
import type { ChatEvent, ChatOpts, ProviderAdapter } from '@sanji/shared';
import { Registry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';

const ask: Skill = { source: 'b', name: 'ask', description: '', trigger: '/ask', body: 'be Sanji' };

function fakeAdapter(events: ChatEvent[]): ProviderAdapter {
  return {
    async *chat() { for (const e of events) yield e; },
    async getAvailableModels() { return []; },
    async testCredentials() { return { ok: true }; },
  };
}

async function collectAll(stream: AsyncGenerator<ChatEvent, { skill: string; toolCalls: number }>, sink: ChatEvent[]) {
  let value: { skill: string; toolCalls: number } | undefined;
  while (true) {
    const r = await stream.next();
    if (r.done) { value = r.value; break; }
    sink.push(r.value);
  }
  return value!;
}

describe('runAgent', () => {
  it('streams text deltas + final stats from a skill match', async () => {
    const adapter = fakeAdapter([
      { type: 'text_delta', text: 'hello' },
      { type: 'message_stop', usage: { input: 1, output: 2 } },
    ]);
    const ctx = {} as ToolContext;
    const out: ChatEvent[] = [];
    const stats = await collectAll(
      runAgent({ adapter, registry: new Registry(), ctx, skills: [ask], defaultModel: 'claude-sonnet-4-6' }, 'hi'),
      out,
    );
    const text = out.filter((e) => e.type === 'text_delta').map((e: any) => e.text).join('');
    expect(text).toBe('hello');
    expect(stats.skill).toBe('ask');
    expect(stats.toolCalls).toBe(0);
  });

  it('counts tool calls and surfaces tool_use_complete events', async () => {
    const adapter = fakeAdapter([
      { type: 'tool_use_complete', id: 't1', name: 'read_note', input: { path: 'a.md' } },
      { type: 'tool_result', id: 't1', content: 'ok' },
      { type: 'text_delta', text: 'done' },
      { type: 'message_stop' },
    ]);
    const ctx = {} as ToolContext;
    const out: ChatEvent[] = [];
    const stats = await collectAll(
      runAgent({ adapter, registry: new Registry(), ctx, skills: [ask], defaultModel: 'claude-sonnet-4-6' }, 'hi'),
      out,
    );
    expect(stats.toolCalls).toBe(1);
    expect(out.find((e) => e.type === 'tool_use_complete')).toBeTruthy();
  });

  it('emits tool_call_start with args_summary after tool_use_complete and tool_call_end after tool_result', async () => {
    const adapter = fakeAdapter([
      { type: 'tool_use_complete', id: 't1', name: 'grep_vault', input: { pattern: 'logistic regression' } },
      { type: 'tool_result', id: 't1', content: 'hit.md:1:logistic regression' },
      { type: 'tool_use_complete', id: 't2', name: 'read_note', input: { path: 'inbox/lr_sgd.md' } },
      { type: 'tool_result', id: 't2', content: 'body' },
      { type: 'text_delta', text: 'ok' },
      { type: 'message_stop' },
    ]);
    const ctx = {} as ToolContext;
    const out: ChatEvent[] = [];
    await collectAll(
      runAgent({ adapter, registry: new Registry(), ctx, skills: [ask], defaultModel: 'claude-sonnet-4-6' }, 'hi'),
      out,
    );

    const types = out.map((e) => e.type);
    // For each tool: tool_use_complete → tool_call_start → tool_result → tool_call_end
    expect(types).toEqual([
      'tool_use_complete',
      'tool_call_start',
      'tool_result',
      'tool_call_end',
      'tool_use_complete',
      'tool_call_start',
      'tool_result',
      'tool_call_end',
      'text_delta',
      'message_stop',
    ]);

    const start1 = out[1] as Extract<ChatEvent, { type: 'tool_call_start' }>;
    expect(start1.tool).toBe('grep_vault');
    expect(start1.args_summary).toBe('Searching for "logistic regression"');
    expect(start1.id).toBe('t1');

    const end1 = out[3] as Extract<ChatEvent, { type: 'tool_call_end' }>;
    expect(end1.tool).toBe('grep_vault');
    expect(end1.id).toBe('t1');

    const start2 = out[5] as Extract<ChatEvent, { type: 'tool_call_start' }>;
    expect(start2.args_summary).toBe('Reading inbox/lr_sgd.md');
  });

  it('falls through to /ask for plain text', async () => {
    const adapter = fakeAdapter([{ type: 'message_stop' }]);
    const stats = await collectAll(
      runAgent(
        { adapter, registry: new Registry(), ctx: {} as ToolContext, skills: [ask], defaultModel: 'claude-sonnet-4-6' },
        'plain question',
      ),
      [],
    );
    expect(stats.skill).toBe('ask');
  });

  it('threads full conversation history into the adapter chat() call, with the latest user content slash-stripped', async () => {
    const captured: { opts?: ChatOpts } = {};
    const adapter: ProviderAdapter = {
      async *chat(opts: ChatOpts) {
        captured.opts = opts;
        yield { type: 'message_stop' } satisfies ChatEvent;
      },
      async getAvailableModels() { return []; },
      async testCredentials() { return { ok: true }; },
    };
    const out: ChatEvent[] = [];
    await collectAll(
      runAgent(
        { adapter, registry: new Registry(), ctx: {} as ToolContext, skills: [ask], defaultModel: 'claude-sonnet-4-6' },
        [
          { role: 'user', content: 'what is logistic regression' },
          { role: 'assistant', content: 'a classifier that...' },
          { role: 'user', content: '/ask remember what I said?' },
        ],
      ),
      out,
    );
    expect(captured.opts).toBeDefined();
    expect(captured.opts!.messages).toEqual([
      { role: 'user', content: 'what is logistic regression' },
      { role: 'assistant', content: 'a classifier that...' },
      // Latest user turn: slash trigger stripped, args preserved.
      { role: 'user', content: 'remember what I said?' },
    ]);
  });

  it('throws when the last message role is not user', async () => {
    const adapter = fakeAdapter([]);
    let caught: unknown;
    try {
      for await (const _ of runAgent(
        { adapter, registry: new Registry(), ctx: {} as ToolContext, skills: [ask], defaultModel: 'claude-sonnet-4-6' },
        [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ],
      )) { /* drain */ }
    } catch (err) { caught = err; }
    expect((caught as Error).message).toMatch(/last message must have role=user/i);
  });

  it('errors when no /ask skill is loaded and the trigger is unknown', async () => {
    const adapter = fakeAdapter([]);
    let caught: unknown;
    try {
      for await (const _ of runAgent(
        { adapter, registry: new Registry(), ctx: {} as ToolContext, skills: [], defaultModel: 'claude-sonnet-4-6' },
        '/unknown msg',
      )) { /* drain */ }
    } catch (err) { caught = err; }
    expect((caught as Error).message).toMatch(/no skill matched/i);
  });
});

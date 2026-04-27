import { describe, expect, it } from 'vitest';
import { runAgent, type AgentDependencies } from './run.js';
import type { Skill } from '../skills/parse.js';
import type { ChatEvent, ProviderAdapter } from '@sanji/shared';
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

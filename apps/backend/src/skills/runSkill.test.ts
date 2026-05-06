import { describe, expect, it } from 'vitest';
import type { ChatEvent, ChatOpts, ProviderAdapter } from '@sanji/shared';
import { runSkill } from './runSkill.js';
import type { Skill } from './parse.js';

class StubAdapter implements ProviderAdapter {
  public lastOpts: ChatOpts | null = null;
  constructor(private readonly chunks: string[]) {}
  async *chat(opts: ChatOpts): AsyncIterable<ChatEvent> {
    this.lastOpts = opts;
    for (const text of this.chunks) {
      yield { type: 'text_delta', text };
    }
    yield { type: 'message_stop', usage: { input: 100, output: 50 } };
  }
  async getAvailableModels() {
    return [];
  }
  async testCredentials() {
    return { ok: true as const };
  }
}

const skill: Skill = {
  trigger: '/ingest',
  name: 'ingest',
  description: 'test skill',
  body: 'You are a test skill. Produce structured output.',
  tools: undefined,
  model: undefined,
  source: 'test',
};

describe('runSkill', () => {
  it('aggregates text_delta events into a single string', async () => {
    const adapter = new StubAdapter(['hello ', 'world']);
    const out = await runSkill({
      skill,
      input: 'extracted text here',
      adapter,
      model: 'claude-sonnet-4-6',
    });
    expect(out).toBe('hello world');
  });

  it('passes the skill body as system prompt and the input as user message', async () => {
    const adapter = new StubAdapter(['ok']);
    await runSkill({
      skill,
      input: 'paper content',
      adapter,
      model: 'claude-sonnet-4-6',
    });
    expect(adapter.lastOpts?.system).toBe(skill.body);
    expect(adapter.lastOpts?.messages).toEqual([{ role: 'user', content: 'paper content' }]);
    expect(adapter.lastOpts?.tools).toBeUndefined();
  });

  it('uses the caller-provided model', async () => {
    const adapter = new StubAdapter(['x']);
    await runSkill({
      skill,
      input: 'x',
      adapter,
      model: 'claude-opus-4-7',
    });
    expect(adapter.lastOpts?.model).toBe('claude-opus-4-7');
  });

  it('aborts via AbortSignal', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const adapter = new StubAdapter(['x']);
    await expect(
      runSkill({
        skill,
        input: 'x',
        adapter,
        model: 'claude-sonnet-4-6',
        abortSignal: ctrl.signal,
      }),
    ).rejects.toThrow(/abort/i);
  });
});

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { chatRoute } from './chat.js';
import type { AgentDependencies, AgentStats } from '../../agent/run.js';
import type { ChatEvent } from '@sanji/shared';

function fakeAgent(events: ChatEvent[]) {
  return async function* (
    _deps: AgentDependencies,
    _msg: string,
  ): AsyncGenerator<ChatEvent, AgentStats, void> {
    for (const e of events) yield e;
    return { skill: 'fake', toolCalls: 0 };
  };
}

describe('chat route', () => {
  it('streams text_delta events as SSE', async () => {
    const events: ChatEvent[] = [
      { type: 'text_delta', text: 'hello' },
      { type: 'text_delta', text: ' world' },
      { type: 'message_stop', usage: { input: 0, output: 0 } },
    ];
    const app = new Hono();
    app.route(
      '/',
      chatRoute({
        deps: {} as AgentDependencies,
        runAgent: fakeAgent(events),
      }),
    );
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hi' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toMatch(/event: text_delta/);
    expect(text).toContain('"text":"hello"');
    expect(text).toMatch(/event: message_stop/);
  });

  it('400s on missing message', async () => {
    const app = new Hono();
    app.route(
      '/',
      chatRoute({ deps: {} as AgentDependencies, runAgent: fakeAgent([]) }),
    );
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

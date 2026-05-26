import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { chatRoute } from './chat.js';
import type { AgentDependencies, AgentStats } from '../../agent/run.js';
import type { ChatEvent, ChatMessage } from '@sanji/shared';

function fakeAgent(events: ChatEvent[]) {
  return async function* (
    _deps: AgentDependencies,
    _input: string | ChatMessage[],
  ): AsyncGenerator<ChatEvent, AgentStats, void> {
    for (const e of events) yield e;
    return { skill: 'fake', toolCalls: 0 };
  };
}

function captureAgent(captured: { input?: string | ChatMessage[] }) {
  return async function* (
    _deps: AgentDependencies,
    input: string | ChatMessage[],
  ): AsyncGenerator<ChatEvent, AgentStats, void> {
    captured.input = input;
    yield { type: 'message_stop', usage: { input: 0, output: 0 } };
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
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toMatch(/event: text_delta/);
    expect(text).toContain('"text":"hello"');
    expect(text).toMatch(/event: message_stop/);
  });

  it('400s on missing messages', async () => {
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

  it('400s when last message is not from user', async () => {
    const app = new Hono();
    app.route(
      '/',
      chatRoute({ deps: {} as AgentDependencies, runAgent: fakeAgent([]) }),
    );
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ],
      }),
    });
    expect(res.status).toBe(400);
  });

  it('passes the full conversation history to the agent', async () => {
    const captured: { input?: string | ChatMessage[] } = {};
    const app = new Hono();
    app.route(
      '/',
      chatRoute({
        deps: {} as AgentDependencies,
        runAgent: captureAgent(captured),
      }),
    );
    const messages: ChatMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'remember what I said?' },
    ];
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    expect(res.status).toBe(200);
    // Drain so the streamSSE callback runs and the captureAgent fires.
    await res.text();
    expect(captured.input).toEqual(messages);
  });

  it('forwards c.req.raw.signal into runAgent so client-aborts reach the SDK', async () => {
    // Capture the signal the route hands to runAgent. The fake agent
    // immediately echoes whether the signal is already aborted, so we
    // can drive a pre-aborted request and assert propagation without
    // needing to race a real-time abort against the SSE stream.
    let receivedSignal: AbortSignal | undefined;
    const recordSignalAgent = async function* (
      _deps: AgentDependencies,
      _input: string | ChatMessage[],
      signal?: AbortSignal,
    ): AsyncGenerator<ChatEvent, AgentStats, void> {
      receivedSignal = signal;
      yield { type: 'message_stop', usage: { input: 0, output: 0 } };
      return { skill: 'fake', toolCalls: 0 };
    };
    const app = new Hono();
    app.route(
      '/',
      chatRoute({
        deps: {} as AgentDependencies,
        runAgent: recordSignalAgent,
      }),
    );
    const ctrl = new AbortController();
    ctrl.abort();
    // The route reads c.req.raw.signal — Hono surfaces fetch's signal
    // there. app.request accepts a RequestInit, including signal.
    const res = await app.request(
      '/api/chat',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
        signal: ctrl.signal,
      },
    );
    expect(res.status).toBe(200);
    await res.text();
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(true);
  });
});

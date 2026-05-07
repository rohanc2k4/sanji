import { describe, expect, it } from 'vitest';
import { applyEvent, makeAssistantTurn, type Turn } from './applyEvent';

function withAssistant(): Turn[] {
  return [
    { role: 'user', content: 'hi' },
    makeAssistantTurn(),
  ];
}

describe('applyEvent', () => {
  it('appends text_delta to last assistant turn', () => {
    const turns = withAssistant();
    const a = applyEvent(turns, { type: 'text_delta', text: 'hi ' });
    const b = applyEvent(a, { type: 'text_delta', text: 'world' });
    const last = b[b.length - 1]!;
    if (last.role !== 'assistant') throw new Error('expected assistant');
    expect(last.deltas).toEqual(['hi ', 'world']);
  });

  it('pushes a tool call on tool_use_complete', () => {
    const turns = withAssistant();
    const a = applyEvent(turns, {
      type: 'tool_use_complete',
      id: 't1',
      name: 'read_note',
      input: { path: 'a.md' },
    });
    const last = a[a.length - 1]!;
    if (last.role !== 'assistant') throw new Error('expected assistant');
    expect(last.toolCalls).toEqual([
      { id: 't1', name: 'read_note', input: { path: 'a.md' } },
    ]);
  });

  it('sets result on the matching toolCall on tool_result', () => {
    const a = applyEvent(withAssistant(), {
      type: 'tool_use_complete',
      id: 't1',
      name: 'read_note',
      input: { path: 'a.md' },
    });
    const b = applyEvent(a, { type: 'tool_result', id: 't1', content: 'body' });
    const last = b[b.length - 1]!;
    if (last.role !== 'assistant') throw new Error('expected assistant');
    expect(last.toolCalls[0]!.result).toBe('body');
  });

  it('message_stop is a no-op for the turn array', () => {
    const turns = withAssistant();
    const next = applyEvent(turns, {
      type: 'message_stop',
      usage: { input: 0, output: 0 },
    });
    expect(next).toBe(turns);
  });

  it('appends error to errors list', () => {
    const turns = withAssistant();
    const next = applyEvent(turns, { type: 'error', message: 'rate limit' });
    const last = next[next.length - 1]!;
    if (last.role !== 'assistant') throw new Error('expected assistant');
    expect(last.errors).toEqual(['rate limit']);
  });

  it('returns turns unchanged when there is no trailing assistant turn', () => {
    const turns: Turn[] = [{ role: 'user', content: 'hi' }];
    const next = applyEvent(turns, { type: 'text_delta', text: 'x' });
    expect(next).toBe(turns);
  });

  it('ignores tool_use_start and tool_use_input_delta (handled by tool_use_complete)', () => {
    const turns = withAssistant();
    const a = applyEvent(turns, { type: 'tool_use_start', id: 't1', name: 'read_note' });
    const b = applyEvent(a, { type: 'tool_use_input_delta', id: 't1', json: '{"path":"a' });
    expect(a).toBe(turns);
    expect(b).toBe(a);
  });

  it('updates currentActivity from tool_call_start and clears on tool_call_end', () => {
    const turns = withAssistant();
    const a = applyEvent(turns, {
      type: 'tool_call_start',
      id: 't1',
      tool: 'grep_vault',
      args_summary: 'Searching for "logistic regression"',
    });
    let last = a[a.length - 1]!;
    if (last.role !== 'assistant') throw new Error('expected assistant');
    expect(last.currentActivity).toBe('Searching for "logistic regression"');

    const b = applyEvent(a, { type: 'tool_call_end', id: 't1', tool: 'grep_vault' });
    last = b[b.length - 1]!;
    if (last.role !== 'assistant') throw new Error('expected assistant');
    expect(last.currentActivity).toBeUndefined();
  });
});

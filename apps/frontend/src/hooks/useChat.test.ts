import { describe, expect, it } from 'vitest';
import type { Turn } from '@/components/applyEvent';
import { applyUsageUpdate, turnsToHistory, ZERO_USAGE } from './useChat';

describe('turnsToHistory', () => {
  it('flattens user + assistant turns and appends the latest user message', () => {
    const turns: Turn[] = [
      { role: 'user', content: 'what is logistic regression' },
      {
        role: 'assistant',
        deltas: ['a class', 'ifier that...'],
        toolCalls: [],
        errors: [],
      },
    ];
    expect(turnsToHistory(turns, 'remember what I said?')).toEqual([
      { role: 'user', content: 'what is logistic regression' },
      { role: 'assistant', content: 'a classifier that...' },
      { role: 'user', content: 'remember what I said?' },
    ]);
  });

  it('drops empty assistant turns (no deltas captured) so we never send empty content', () => {
    const turns: Turn[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', deltas: [], toolCalls: [], errors: [] },
    ];
    expect(turnsToHistory(turns, 'still there?')).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'user', content: 'still there?' },
    ]);
  });

  it('returns just the latest user message when there is no prior history', () => {
    expect(turnsToHistory([], 'first message')).toEqual([
      { role: 'user', content: 'first message' },
    ]);
  });

  it('skips session_break turns when building history', () => {
    const turns: Turn[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', deltas: ['hello'], toolCalls: [], errors: [] },
      { role: 'session_break', trigger: 'manual', message: null, timestamp: new Date() },
      { role: 'user', content: 'are you there' },
      { role: 'assistant', deltas: ['yes'], toolCalls: [], errors: [] },
    ];
    const history = turnsToHistory(turns, 'follow up');
    // Two user + two assistant + one trailing user = 5 entries; session_break dropped.
    expect(history).toHaveLength(5);
    expect(history.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user']);
    expect(history[history.length - 1]).toEqual({ role: 'user', content: 'follow up' });
  });
});

describe('applyUsageUpdate', () => {
  it('starts from zero and adds the first turn', () => {
    expect(applyUsageUpdate(ZERO_USAGE, { input_tokens: 137, output_tokens: 42 })).toEqual({
      inputTokens: 137,
      outputTokens: 42,
    });
  });

  it('accumulates across multiple turns', () => {
    let usage = ZERO_USAGE;
    usage = applyUsageUpdate(usage, { input_tokens: 100, output_tokens: 50 });
    usage = applyUsageUpdate(usage, { input_tokens: 200, output_tokens: 75 });
    usage = applyUsageUpdate(usage, { input_tokens: 50, output_tokens: 25 });
    expect(usage).toEqual({ inputTokens: 350, outputTokens: 150 });
  });

  it('treats missing fields as zero (adapter reports no usage)', () => {
    const usage = applyUsageUpdate({ inputTokens: 10, outputTokens: 5 }, {});
    expect(usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('zero-tokens turn does not move the counter', () => {
    const usage = applyUsageUpdate(
      { inputTokens: 100, outputTokens: 50 },
      { input_tokens: 0, output_tokens: 0 },
    );
    expect(usage).toEqual({ inputTokens: 100, outputTokens: 50 });
  });
});

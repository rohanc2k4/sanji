import { describe, expect, it } from 'vitest';
import type { Turn } from '@/components/applyEvent';
import { turnsToHistory } from './useChat';

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
});

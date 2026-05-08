import { describe, expect, it } from 'vitest';
import type { Turn } from '@/components/applyEvent';
import { applyUsageUpdate, computeIdleMs, makeSessionBreakTurn, turnsToHistory, ZERO_USAGE } from './useChat';
import { shouldClearOnThreshold } from '@/chat/auto-clear';

describe('threshold trigger pure-reducer integration', () => {
  it('combining applyUsageUpdate + shouldClearOnThreshold flags when usage crosses', () => {
    const before = { inputTokens: 140_000, outputTokens: 1_000 };
    // input_tokens replaces (the provider already counts prior history)
    const after = applyUsageUpdate(before, { input_tokens: 151_000, output_tokens: 500 });
    expect(after.inputTokens).toBe(151_000);
    expect(after.outputTokens).toBe(1_500);
    expect(shouldClearOnThreshold(after, 200_000, 0.75)).toBe(true);
  });

  it('does not flag when usage stays below the line', () => {
    const before = { inputTokens: 80_000, outputTokens: 0 };
    const after = applyUsageUpdate(before, { input_tokens: 85_000, output_tokens: 0 });
    expect(shouldClearOnThreshold(after, 200_000, 0.75)).toBe(false);
  });
});

describe('computeIdleMs', () => {
  it('converts minutes to milliseconds', () => {
    expect(computeIdleMs(30)).toBe(30 * 60 * 1000);
  });
  it('clamps to a positive number when given zero or negative', () => {
    expect(computeIdleMs(0)).toBe(60 * 1000); // floor: 1 minute
    expect(computeIdleMs(-5)).toBe(60 * 1000);
  });
  it('floors fractional minutes to integer minutes before converting', () => {
    expect(computeIdleMs(1.7)).toBe(60 * 1000);
  });
});

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
  it('starts from zero and adopts the first turn', () => {
    expect(applyUsageUpdate(ZERO_USAGE, { input_tokens: 137, output_tokens: 42 })).toEqual({
      inputTokens: 137,
      outputTokens: 42,
    });
  });

  it('replaces input_tokens with latest sample, accumulates output_tokens', () => {
    // The provider re-reports the FULL prompt (including prior turns'
    // assistant responses fed back as history) on every turn. Adding
    // them double-counts. Latest input_tokens is "the size the next
    // request would be"; output_tokens is genuinely incremental so
    // it accumulates.
    let usage = ZERO_USAGE;
    usage = applyUsageUpdate(usage, { input_tokens: 100, output_tokens: 50 });
    usage = applyUsageUpdate(usage, { input_tokens: 200, output_tokens: 75 });
    usage = applyUsageUpdate(usage, { input_tokens: 350, output_tokens: 25 });
    expect(usage).toEqual({ inputTokens: 350, outputTokens: 150 });
  });

  it('treats missing input_tokens as keep-prev, missing output_tokens as zero', () => {
    const usage = applyUsageUpdate({ inputTokens: 10, outputTokens: 5 }, {});
    expect(usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('zero output_tokens does not move the output counter', () => {
    const usage = applyUsageUpdate(
      { inputTokens: 100, outputTokens: 50 },
      { input_tokens: 110, output_tokens: 0 },
    );
    expect(usage).toEqual({ inputTokens: 110, outputTokens: 50 });
  });
});

describe('threshold-warning contract (no auto-clear)', () => {
  // The useChat hook is not exercised here directly (no RTL). These
  // assertions cover the two-step pure logic: the reducer's latest-input
  // semantics combined with shouldClearOnThreshold should produce a
  // single "true" that stays true on subsequent same-or-higher
  // input_tokens. The hook layer reads this and flips a `thresholdWarning`
  // boolean (idempotent — re-firing the same true does not re-clear).
  it('crosses once and stays crossed until clear()', () => {
    let usage = ZERO_USAGE;
    usage = applyUsageUpdate(usage, { input_tokens: 100_000, output_tokens: 0 });
    expect(shouldClearOnThreshold(usage, 200_000, 0.75)).toBe(false);
    usage = applyUsageUpdate(usage, { input_tokens: 151_000, output_tokens: 100 });
    expect(shouldClearOnThreshold(usage, 200_000, 0.75)).toBe(true);
    usage = applyUsageUpdate(usage, { input_tokens: 160_000, output_tokens: 200 });
    expect(shouldClearOnThreshold(usage, 200_000, 0.75)).toBe(true);
  });
});

describe('makeSessionBreakTurn', () => {
  it('produces a manual session break with null message', () => {
    const t = makeSessionBreakTurn('manual', new Date('2026-05-08T12:00:00Z'));
    expect(t.role).toBe('session_break');
    if (t.role !== 'session_break') return;
    expect(t.trigger).toBe('manual');
    expect(t.message).toBeNull();
  });
  it('produces an idle session break with the cat-voiced idle message', () => {
    const t = makeSessionBreakTurn('idle', new Date());
    expect(t.role).toBe('session_break');
    if (t.role !== 'session_break') return;
    expect(t.trigger).toBe('idle');
    expect(t.message).toContain('purr-haps');
  });
  it('produces a threshold session break with the cat-voiced threshold message', () => {
    const t = makeSessionBreakTurn('threshold', new Date());
    expect(t.role).toBe('session_break');
    if (t.role !== 'session_break') return;
    expect(t.trigger).toBe('threshold');
    expect(t.message).toContain('paws');
  });
});

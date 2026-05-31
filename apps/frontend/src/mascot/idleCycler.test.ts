import { describe, expect, it } from 'vitest';
import { initCycler, advanceCycler, SUB_MOODS, DWELL_MIN_MS, DWELL_MAX_MS, type CyclerState } from './idleCycler';

// Deterministic rng: cycles through the provided values.
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('idleCycler', () => {
  it('initCycler picks a valid mood and schedules inside the dwell window', () => {
    const c = initCycler(1000, seq([0.5]));
    expect(SUB_MOODS).toContain(c.mood);
    expect(c.nextAtMs - 1000).toBeGreaterThanOrEqual(DWELL_MIN_MS);
    expect(c.nextAtMs - 1000).toBeLessThanOrEqual(DWELL_MAX_MS);
  });

  it('does not switch before nextAtMs (returns the same state)', () => {
    const c: CyclerState = { mood: 'idle', nextAtMs: 5000 };
    expect(advanceCycler(c, 4999, seq([0]))).toBe(c);
  });

  it('switches at or after nextAtMs and never repeats the previous mood', () => {
    const out = advanceCycler({ mood: 'snooze', nextAtMs: 100 }, 100, seq([0]));
    expect(out.mood).not.toBe('snooze');
    expect(SUB_MOODS).toContain(out.mood);
  });

  it('keeps every scheduled dwell inside the window across many switches', () => {
    let c = initCycler(0, seq([0.1, 0.9, 0.3, 0.7, 0.5]));
    for (let i = 0; i < 50; i++) {
      const at = c.nextAtMs;
      const prev = c.mood;
      c = advanceCycler(c, at, seq([0.2, 0.8, 0.4, 0.6]));
      expect(c.mood).not.toBe(prev);
      expect(c.nextAtMs - at).toBeGreaterThanOrEqual(DWELL_MIN_MS);
      expect(c.nextAtMs - at).toBeLessThanOrEqual(DWELL_MAX_MS);
    }
  });
});

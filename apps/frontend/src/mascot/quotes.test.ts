import { describe, expect, it } from 'vitest';
import { pickOnboardingQuote } from './quotes';

describe('pickOnboardingQuote', () => {
  it('returns a non-empty string', () => {
    expect(pickOnboardingQuote(0).length).toBeGreaterThan(0);
  });

  it('indexes deterministically by seed', () => {
    expect(pickOnboardingQuote(3)).toBe(pickOnboardingQuote(3));
  });

  it('different seeds surface more than one line', () => {
    const seen = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => pickOnboardingQuote(s)));
    expect(seen.size).toBeGreaterThan(1);
  });
});

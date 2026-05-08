import { describe, expect, it } from 'vitest';
import { contextBarPercent, contextBarTone } from './ContextBar';

describe('contextBarPercent', () => {
  it('rounds to integer percent', () => {
    expect(contextBarPercent(12_847, 200_000)).toBe(6);
  });

  it('returns 0 for fresh conversation', () => {
    expect(contextBarPercent(0, 200_000)).toBe(0);
  });

  it('caps at 100 when usage exceeds the window (overflow safety)', () => {
    expect(contextBarPercent(250_000, 200_000)).toBe(100);
  });

  it('returns 0 when contextWindow is zero or negative (defensive)', () => {
    expect(contextBarPercent(100, 0)).toBe(0);
    expect(contextBarPercent(100, -1)).toBe(0);
  });
});

describe('contextBarTone', () => {
  it('returns low under 70%', () => {
    expect(contextBarTone(0)).toBe('low');
    expect(contextBarTone(50)).toBe('low');
    expect(contextBarTone(69)).toBe('low');
  });

  it('returns mid at 70-89%', () => {
    expect(contextBarTone(70)).toBe('mid');
    expect(contextBarTone(85)).toBe('mid');
    expect(contextBarTone(89)).toBe('mid');
  });

  it('returns high at 90%+', () => {
    expect(contextBarTone(90)).toBe('high');
    expect(contextBarTone(95)).toBe('high');
    expect(contextBarTone(100)).toBe('high');
  });
});

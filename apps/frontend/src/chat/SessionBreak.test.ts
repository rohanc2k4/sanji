import { describe, it, expect } from 'vitest';
import { sessionBreakLabel } from './SessionBreak';

describe('sessionBreakLabel', () => {
  it('returns "fresh thread" for idle trigger', () => {
    expect(sessionBreakLabel('idle')).toBe('fresh thread');
  });
  it('returns "fresh thread" for threshold trigger', () => {
    expect(sessionBreakLabel('threshold')).toBe('fresh thread');
  });
  it('returns "fresh thread" for manual trigger', () => {
    expect(sessionBreakLabel('manual')).toBe('fresh thread');
  });
});

import { describe, it, expect } from 'vitest';
import { sessionMessageFor, IDLE_MESSAGE, THRESHOLD_MESSAGE } from './session-messages';

describe('sessionMessageFor', () => {
  it('returns null for manual trigger', () => {
    expect(sessionMessageFor('manual')).toBeNull();
  });
  it('returns the cat-voiced idle message for idle trigger', () => {
    expect(sessionMessageFor('idle')).toBe(IDLE_MESSAGE);
  });
  it('returns the cat-voiced threshold message for threshold trigger', () => {
    expect(sessionMessageFor('threshold')).toBe(THRESHOLD_MESSAGE);
  });
});

describe('cat-voiced messages', () => {
  it('idle message contains "purr-haps"', () => {
    expect(IDLE_MESSAGE).toContain('purr-haps');
  });
  it('threshold message contains "paws"', () => {
    expect(THRESHOLD_MESSAGE).toContain('paws');
  });
  it('neither message contains an em dash', () => {
    expect(IDLE_MESSAGE).not.toContain('—');
    expect(THRESHOLD_MESSAGE).not.toContain('—');
  });
});

import { describe, expect, it } from 'vitest';
import { palette } from './palette';

describe('palette', () => {
  it('exposes the named cat colors as hex strings', () => {
    const keys = ['K', 'O', 'H', 'S', 'C', 'P', 'G', 'GD', 'D', 'W', 'WI', 'WS'] as const;
    for (const k of keys) {
      expect(palette[k]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('base orange matches the tabby accent', () => {
    expect(palette.O).toBe('#E0884A');
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderAvatar } from './avatarImage';
import { makeSpyCtx } from './art/spy-context';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderAvatar', () => {
  it('returns a non-empty data URL when a 2D context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      makeSpyCtx() as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA');
    expect(renderAvatar()).toBe('data:image/png;base64,AAAA');
  });

  it('returns null without throwing when the context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(() => renderAvatar()).not.toThrow();
    expect(renderAvatar()).toBeNull();
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeSpyCtx } from './art/spy-context';
import { SanjiAvatar } from './SanjiAvatar';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    makeSpyCtx() as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SanjiAvatar', () => {
  it('renders an img labelled Sanji', () => {
    render(<SanjiAvatar />);
    const img = screen.getByAltText('Sanji');
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe('IMG');
  });
});

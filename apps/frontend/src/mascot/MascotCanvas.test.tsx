import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MascotCanvas } from './MascotCanvas';
import { makeSpyCtx } from './art/spy-context';

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  // jsdom has no 2D context; hand back a spy so the draw callback can run.
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => makeSpyCtx(),
  ) as unknown as HTMLCanvasElement['getContext'];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MascotCanvas', () => {
  it('under reduced motion, draws one frame and starts no loop', () => {
    mockMatchMedia(true);
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    const draw = vi.fn();
    render(<MascotCanvas width={64} height={64} draw={draw} animated ariaLabel="Sanji is idle" />);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(raf).not.toHaveBeenCalled();
  });

  it('when animated, starts a loop and cancels its rAF on unmount', () => {
    mockMatchMedia(false);
    let rafId = 0;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => ++rafId);
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    const { unmount } = render(<MascotCanvas width={64} height={64} draw={vi.fn()} animated />);
    expect(rafId).toBeGreaterThan(0);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it('renders a labelled canvas even when animated is false', () => {
    mockMatchMedia(false);
    const { getByLabelText } = render(
      <MascotCanvas width={64} height={64} draw={vi.fn()} animated={false} ariaLabel="Sanji is active" />,
    );
    expect(getByLabelText('Sanji is active')).toBeInTheDocument();
  });
});

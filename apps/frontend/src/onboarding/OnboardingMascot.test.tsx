import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingMascot } from './OnboardingMascot';

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OnboardingMascot', () => {
  it('mounts the overlay', () => {
    mockMatchMedia(false);
    render(<OnboardingMascot step="vault" />);
    expect(screen.getByTestId('onboarding-mascot')).toBeInTheDocument();
  });

  it('does not throw when the step prop changes', () => {
    mockMatchMedia(false);
    const { rerender } = render(<OnboardingMascot step="vault" />);
    expect(() => rerender(<OnboardingMascot step="indexing" />)).not.toThrow();
    expect(() => rerender(<OnboardingMascot step="done" />)).not.toThrow();
  });

  it('renders the static fallback and starts no loop under reduced motion', () => {
    mockMatchMedia(true);
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    render(<OnboardingMascot step="vault" />);
    expect(screen.getByTestId('onboarding-mascot')).toBeInTheDocument();
    expect(raf).not.toHaveBeenCalled();
  });
});

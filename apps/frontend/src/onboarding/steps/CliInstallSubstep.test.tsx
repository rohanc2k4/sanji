import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CliInstallSubstep } from './CliInstallSubstep';

// jsdom doesn't expose a clipboard by default; stub it on each test so the
// copy button has something to call.
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

describe('CliInstallSubstep', () => {
  const baseProps = {
    os: 'darwin' as const,
    onRecheck: vi.fn(),
    onSwitchToApiKey: vi.fn(),
    onBack: vi.fn(),
    rechecking: false,
    lastRecheckFailed: false,
  };

  it('renders the macOS install snippet for os=darwin', () => {
    render(<CliInstallSubstep {...baseProps} os="darwin" />);
    expect(screen.getByText(/curl -fsSL https:\/\/claude\.ai\/install\.sh/)).toBeInTheDocument();
    expect(screen.getByText(/macOS/)).toBeInTheDocument();
  });

  it('renders the Windows install snippet for os=win32', () => {
    render(<CliInstallSubstep {...baseProps} os="win32" />);
    expect(screen.getByText(/irm https:\/\/claude\.ai\/install\.ps1/)).toBeInTheDocument();
  });

  it('copies the install command to the clipboard when the copy button is clicked', () => {
    render(<CliInstallSubstep {...baseProps} os="darwin" />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'curl -fsSL https://claude.ai/install.sh | sh',
    );
  });

  it('toggles the OS picker when Wrong OS is clicked and swaps snippets', () => {
    render(<CliInstallSubstep {...baseProps} os="darwin" />);
    fireEvent.click(screen.getByRole('button', { name: /wrong os/i }));
    fireEvent.click(screen.getByRole('button', { name: /^linux$/i }));
    expect(screen.getByText(/curl -fsSL https:\/\/claude\.ai\/install\.sh/)).toBeInTheDocument();
  });

  it('fires onRecheck when the recheck button is clicked', () => {
    render(<CliInstallSubstep {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /recheck/i }));
    expect(baseProps.onRecheck).toHaveBeenCalled();
  });

  it('disables the recheck button while rechecking=true', () => {
    render(<CliInstallSubstep {...baseProps} rechecking={true} />);
    const btn = screen.getByRole('button', { name: /recheck/i });
    expect(btn).toBeDisabled();
  });

  it('shows the still-not-detected hint when lastRecheckFailed=true', () => {
    render(<CliInstallSubstep {...baseProps} lastRecheckFailed={true} />);
    expect(screen.getByText(/still not detected/i)).toBeInTheDocument();
  });

  it('renders the reason box when reason is provided', () => {
    render(<CliInstallSubstep {...baseProps} reason="permission denied at /usr/local/bin/claude" />);
    expect(screen.getByText(/permission denied/)).toBeInTheDocument();
  });

  it('fires onBack when the back link is clicked', () => {
    render(<CliInstallSubstep {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /back to provider choice/i }));
    expect(baseProps.onBack).toHaveBeenCalled();
  });
});

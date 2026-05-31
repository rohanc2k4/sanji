import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Mascot } from './Mascot';

// jsdom has no 2D context, so MascotCanvas no-ops the draw; the canvas element
// and aria-label still render, and the quote bubble is plain DOM either way.
describe('Mascot', () => {
  it('renders nothing in off mode', () => {
    const { container } = render(<Mascot mode="off" chatStreaming={false} lastError={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reflects the machine state in the aria-label (active while streaming)', () => {
    render(<Mascot mode="chatty" chatStreaming={true} lastError={null} />);
    expect(screen.getByLabelText('Sanji is active')).toBeInTheDocument();
  });

  it('shows a quote bubble in chatty mode', () => {
    render(<Mascot mode="chatty" chatStreaming={true} lastError={null} />);
    // The active quote pool is non-empty; one of its lines renders in the bubble.
    expect(screen.getByText(/sniffing|chasing|thinking|rummaging/i)).toBeInTheDocument();
  });

  it('renders the canvas but no bubble in quiet mode', () => {
    render(<Mascot mode="quiet" chatStreaming={true} lastError={null} />);
    expect(screen.getByLabelText('Sanji is active')).toBeInTheDocument();
    expect(screen.queryByText(/sniffing|chasing|thinking|rummaging/i)).not.toBeInTheDocument();
  });
});

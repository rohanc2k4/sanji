import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewItemRow } from './NewItemRow';

describe('NewItemRow', () => {
  it('Enter commits the current draft', () => {
    const onCommit = vi.fn();
    render(<NewItemRow indent={8} itemKind="note" onCommit={onCommit} onCancel={vi.fn()} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'todo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('todo');
  });

  it('Esc cancels', () => {
    const onCancel = vi.fn();
    render(<NewItemRow indent={8} itemKind="folder" onCommit={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('blur commits the draft (matches existing rename pattern)', () => {
    const onCommit = vi.fn();
    render(<NewItemRow indent={8} itemKind="note" onCommit={onCommit} onCancel={vi.fn()} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('a');
  });

  it('renders the right icon for folder vs note', () => {
    const { rerender } = render(
      <NewItemRow indent={8} itemKind="note" onCommit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByTestId('icon-note')).toBeInTheDocument();
    rerender(<NewItemRow indent={8} itemKind="folder" onCommit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('icon-folder')).toBeInTheDocument();
  });
});

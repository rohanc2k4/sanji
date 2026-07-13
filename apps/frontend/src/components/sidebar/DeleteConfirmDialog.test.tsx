import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  it('renders note copy when target is a note', () => {
    render(
      <DeleteConfirmDialog
        target={{ kind: 'note', path: 'inbox/a.md', name: 'a.md' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Move a\.md to \.sanji\/trash\//)).toBeInTheDocument();
  });

  it('renders folder copy with note count when target is a folder', () => {
    render(
      <DeleteConfirmDialog
        target={{
          kind: 'folder', path: 'archive', name: 'archive',
          containedNotes: ['archive/a.md', 'archive/b.md'],
        }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Move archive and its 2 notes/)).toBeInTheDocument();
  });

  it('lists up to 5 contained notes then "and K more"', () => {
    const six = ['a/1.md', 'a/2.md', 'a/3.md', 'a/4.md', 'a/5.md', 'a/6.md'];
    render(
      <DeleteConfirmDialog
        target={{ kind: 'folder', path: 'a', name: 'a', containedNotes: six }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/and 1 more/)).toBeInTheDocument();
  });

  it('calls onConfirm when Move to trash is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        target={{ kind: 'note', path: 'a.md', name: 'a.md' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /move to trash/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        target={{ kind: 'note', path: 'a.md', name: 'a.md' }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

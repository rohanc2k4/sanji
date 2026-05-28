import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SourcesSidebar } from './SourcesSidebar';

vi.mock('@/api/vault', () => ({
  listNotes: vi.fn().mockResolvedValue([
    { path: 'a.md', title: 'A', mtimeMs: Date.now() },
  ]),
}));
vi.mock('@/api/notes', () => ({
  renameNote: vi.fn(),
  createNote: vi.fn(),
  deleteNote: vi.fn().mockResolvedValue({ path: 'a.md', trashedTo: '.sanji/trash/a.md' }),
}));
vi.mock('@/api/folders', () => ({
  moveFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SourcesSidebar delete flow', () => {
  it('clicking 🗑 on a note opens confirm; confirm calls deleteNote', async () => {
    const onDeleted = vi.fn();
    render(
      <SourcesSidebar
        selectedPath={null}
        onSelect={vi.fn()}
        onAddSource={vi.fn()}
        onDeleted={onDeleted}
      />,
    );
    await screen.findByLabelText('a.md');
    fireEvent.click(screen.getByLabelText('Delete a.md'));
    expect(
      await screen.findByText(/Move a\.md to \.sanji\/trash\//),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /move to trash/i }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('a.md'));
  });

  it('clicking + Folder spawns a new-item row at root', async () => {
    render(
      <SourcesSidebar
        selectedPath={null}
        onSelect={vi.fn()}
        onAddSource={vi.fn()}
      />,
    );
    await screen.findByLabelText('a.md');
    fireEvent.click(screen.getByRole('button', { name: /^Folder$/i }));
    expect(screen.getByPlaceholderText('folder name')).toBeInTheDocument();
  });
});

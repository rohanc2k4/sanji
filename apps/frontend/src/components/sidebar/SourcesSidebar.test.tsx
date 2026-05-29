import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SourcesSidebar } from './SourcesSidebar';
import * as vaultApi from '@/api/vault';
import * as notesApi from '@/api/notes';

vi.mock('@/api/vault', () => ({
  listNotes: vi.fn().mockResolvedValue([
    { path: 'a.md', title: 'A', mtimeMs: Date.now() },
  ]),
}));
vi.mock('@/api/notes', () => ({
  renameNote: vi.fn().mockResolvedValue({ from: 'a.md', to: 'a.md' }),
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

describe('SourcesSidebar root drop zone', () => {
  it('dragStart reveals the drop zone; drop on it calls renameNote with root path', async () => {
    vi.mocked(vaultApi.listNotes).mockResolvedValue([
      { path: 'inbox/a.md', title: 'A', mtimeMs: Date.now() },
    ]);
    vi.mocked(notesApi.renameNote).mockResolvedValue({ from: 'inbox/a.md', to: 'a.md' });

    render(
      <SourcesSidebar
        selectedPath={null}
        onSelect={vi.fn()}
        onAddSource={vi.fn()}
      />,
    );

    // Wait for the note row to appear (it's inside the 'inbox' folder as 'a.md')
    await screen.findByLabelText('a.md');

    // Root drop zone should not be visible yet
    expect(screen.queryByText('Move to root')).not.toBeInTheDocument();

    // Fire dragStart on the note button to set dragging=true
    const noteButton = screen.getByLabelText('a.md');
    fireEvent.dragStart(noteButton, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: '',
      },
    });

    // Root drop zone should now be visible
    expect(await screen.findByText('Move to root')).toBeInTheDocument();

    // Drop on the root drop zone with the nested note payload
    const rootZone = screen.getByText('Move to root');
    fireEvent.drop(rootZone, {
      dataTransfer: {
        getData: (_type: string) => JSON.stringify({ kind: 'note', path: 'inbox/a.md' }),
      },
    });

    // renameNote should be called with ('inbox/a.md', 'a.md') — moving to vault root
    await waitFor(() =>
      expect(notesApi.renameNote).toHaveBeenCalledWith('inbox/a.md', 'a.md'),
    );
  });
});

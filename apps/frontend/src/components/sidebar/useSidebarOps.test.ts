import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/api/notes', () => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  renameNote: vi.fn(),
}));
vi.mock('@/api/folders', () => ({
  moveFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import * as notesApi from '@/api/notes';
import * as foldersApi from '@/api/folders';
import { toast } from 'sonner';
import { useSidebarOps } from './useSidebarOps';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSidebarOps', () => {
  it('createNote resolves and bumps reload key on success', async () => {
    (notesApi.createNote as any).mockResolvedValue({ path: 'a.md' });
    const onReload = vi.fn();
    const { result } = renderHook(() => useSidebarOps({ onReload }));
    await act(async () => {
      await result.current.createNote('a.md');
    });
    expect(notesApi.createNote).toHaveBeenCalledWith('a.md', undefined);
    expect(onReload).toHaveBeenCalled();
  });

  it('createNote toasts on 409 and does not bump reload', async () => {
    (notesApi.createNote as any).mockRejectedValue({
      kind: 'api-error',
      code: 'TARGET_EXISTS',
      message: 'a.md',
    });
    const onReload = vi.fn();
    const { result } = renderHook(() => useSidebarOps({ onReload }));
    await act(async () => {
      try {
        await result.current.createNote('a.md');
      } catch {
        /* swallow */
      }
    });
    expect(toast.error).toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('deleteNote calls API and bumps reload', async () => {
    (notesApi.deleteNote as any).mockResolvedValue({
      path: 'a.md',
      trashedTo: '.sanji/trash/a.md',
    });
    const onReload = vi.fn();
    const { result } = renderHook(() => useSidebarOps({ onReload }));
    await act(async () => {
      await result.current.deleteNote('a.md');
    });
    expect(notesApi.deleteNote).toHaveBeenCalledWith('a.md');
    expect(onReload).toHaveBeenCalled();
  });

  it('moveNote composes target path and calls renameNote', async () => {
    (notesApi.renameNote as any).mockResolvedValue({
      from: 'inbox/a.md',
      to: 'archive/a.md',
    });
    const onReload = vi.fn();
    const { result } = renderHook(() => useSidebarOps({ onReload }));
    await act(async () => {
      await result.current.moveNote('inbox/a.md', 'archive');
    });
    expect(notesApi.renameNote).toHaveBeenCalledWith('inbox/a.md', 'archive/a.md');
  });

  it('moveFolder calls folders/move and toasts on 409', async () => {
    (foldersApi.moveFolder as any).mockRejectedValue({
      kind: 'api-error',
      code: 'TARGET_EXISTS',
      message: 'archive',
    });
    const onReload = vi.fn();
    const { result } = renderHook(() => useSidebarOps({ onReload }));
    await act(async () => {
      try {
        await result.current.moveFolder('inbox', 'archive');
      } catch {
        /* swallow */
      }
    });
    expect(toast.error).toHaveBeenCalled();
  });
});

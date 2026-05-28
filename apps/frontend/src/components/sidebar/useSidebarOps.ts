import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { isApiError } from '@sanji/shared';
import {
  createNote as apiCreateNote,
  deleteNote as apiDeleteNote,
  renameNote as apiRenameNote,
} from '@/api/notes';
import { moveFolder as apiMoveFolder, deleteFolder as apiDeleteFolder } from '@/api/folders';

export interface UseSidebarOpsArgs {
  onReload: () => void;
  onRenamed?: (from: string, to: string) => void;
  onDeleted?: (path: string) => void;
  onFolderMoved?: (from: string, to: string) => void;
  onFolderDeleted?: (path: string) => void;
}

function describe(err: unknown): string {
  if (isApiError(err)) return err.message || err.code;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function useSidebarOps(args: UseSidebarOpsArgs) {
  const inFlight = useRef(false);

  const guarded = <T,>(fn: () => Promise<T>): Promise<T | undefined> =>
    inFlight.current
      ? Promise.resolve(undefined)
      : (async () => {
          inFlight.current = true;
          try {
            return await fn();
          } finally {
            inFlight.current = false;
          }
        })();

  const createNote = useCallback(
    async (path: string, content?: string) => {
      return guarded(async () => {
        try {
          await apiCreateNote(path, content);
          args.onReload();
        } catch (err) {
          toast.error('Could not create note', { description: describe(err) });
          throw err;
        }
      });
    },
    [args],
  );

  const deleteNote = useCallback(
    async (path: string) => {
      return guarded(async () => {
        try {
          await apiDeleteNote(path);
          args.onReload();
          args.onDeleted?.(path);
        } catch (err) {
          toast.error('Could not delete note', { description: describe(err) });
          throw err;
        }
      });
    },
    [args],
  );

  const moveNote = useCallback(
    async (from: string, targetFolder: string) => {
      const basename = from.includes('/') ? from.slice(from.lastIndexOf('/') + 1) : from;
      const to = targetFolder ? `${targetFolder}/${basename}` : basename;
      return guarded(async () => {
        try {
          await apiRenameNote(from, to);
          args.onReload();
          args.onRenamed?.(from, to);
        } catch (err) {
          toast.error('Could not move note', { description: describe(err) });
          throw err;
        }
      });
    },
    [args],
  );

  const moveFolder = useCallback(
    async (from: string, to: string) => {
      return guarded(async () => {
        try {
          await apiMoveFolder(from, to);
          args.onReload();
          args.onFolderMoved?.(from, to);
        } catch (err) {
          toast.error('Could not move folder', { description: describe(err) });
          throw err;
        }
      });
    },
    [args],
  );

  const deleteFolder = useCallback(
    async (path: string) => {
      return guarded(async () => {
        try {
          await apiDeleteFolder(path);
          args.onReload();
          args.onFolderDeleted?.(path);
        } catch (err) {
          toast.error('Could not delete folder', { description: describe(err) });
          throw err;
        }
      });
    },
    [args],
  );

  return { createNote, deleteNote, moveNote, moveFolder, deleteFolder };
}

import { isApiError } from '@sanji/shared';
import { apiFetch } from './client.js';

export interface NoteDoc {
  path: string;
  title: string | null;
  frontmatter: unknown;
  body: string;
}

// Returns null when the file doesn't exist on disk yet. Callers like the
// EditorPanel use this to open a new file: 404 is the designed-for case
// (write-on-save), not an error worth surfacing.
export async function getNote(path: string): Promise<NoteDoc | null> {
  try {
    return await apiFetch<NoteDoc>(`/api/notes/${encodeURIComponent(path)}`);
  } catch (err) {
    if (isApiError(err) && (err.code === 'HTTP_404' || err.code === 'NOT_FOUND')) {
      return null;
    }
    throw err;
  }
}

export const putNote = (path: string, content: string) =>
  apiFetch<{ path: string; bytesWritten: number; snapshot: string | null }>(
    `/api/notes/${encodeURIComponent(path)}`,
    { method: 'PUT', body: JSON.stringify({ content }) },
  );

export const renameNote = (from: string, to: string) =>
  apiFetch<{ from: string; to: string }>('/api/notes/rename', {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  });

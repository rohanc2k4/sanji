import { apiFetch } from './client.js';

export interface NoteDoc {
  path: string;
  title: string | null;
  frontmatter: unknown;
  body: string;
}

export const getNote = (path: string) =>
  apiFetch<NoteDoc>(`/api/notes/${encodeURIComponent(path)}`);

export const putNote = (path: string, content: string) =>
  apiFetch<{ path: string; bytesWritten: number; snapshot: string | null }>(
    `/api/notes/${encodeURIComponent(path)}`,
    { method: 'PUT', body: JSON.stringify({ content }) },
  );

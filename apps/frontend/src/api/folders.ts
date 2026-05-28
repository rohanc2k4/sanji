import { apiFetch } from './client.js';

export const moveFolder = (from: string, to: string) =>
  apiFetch<{ from: string; to: string }>('/api/folders/move', {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  });

export const deleteFolder = (path: string) =>
  apiFetch<{ path: string; trashedTo: string }>(
    `/api/folders/${encodeURIComponent(path)}`,
    { method: 'DELETE' },
  );

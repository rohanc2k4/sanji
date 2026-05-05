import type { NoteSummary } from '@sanji/shared';
import { apiFetch } from './client.js';

export const listNotes = (prefix?: string) =>
  apiFetch<NoteSummary[]>(
    `/api/vault/notes${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`,
  );

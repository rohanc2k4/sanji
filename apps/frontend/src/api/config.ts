import type { ConfigDto } from '@sanji/shared';
import { apiFetch } from './client.js';

export const getConfig = () => apiFetch<ConfigDto>('/api/config');
export const patchConfig = (patch: Partial<ConfigDto>) =>
  apiFetch<ConfigDto>('/api/config', { method: 'PATCH', body: JSON.stringify(patch) });

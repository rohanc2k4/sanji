import type { ApiError } from '@sanji/shared';
import { isApiError } from '@sanji/shared';

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (isApiError(body)) throw body;
    throw {
      kind: 'api-error',
      code: `HTTP_${res.status}`,
      message: res.statusText,
    } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

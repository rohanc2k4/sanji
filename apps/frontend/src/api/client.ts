import type { ApiError } from '@sanji/shared';
import { isApiError } from '@sanji/shared';

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  // Only set content-type when there's actually a body. GET / DELETE without
  // a body should not advertise a JSON content-type — some servers (Hono
  // included on edge cases) try to parse the missing body and produce
  // confusing errors.
  const callerHeaders = init?.headers ?? {};
  const headers = init?.body
    ? { 'content-type': 'application/json', ...callerHeaders }
    : callerHeaders;
  const res = await fetch(input, { ...init, headers });
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

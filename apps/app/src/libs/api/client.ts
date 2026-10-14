// The one fetch wrapper. Paths are resolved against the page's origin, where
// Caddy (or the Vite dev proxy) serves the API. Every response body is handed
// to a parser, normally a Zod schema's `parse` from @bhojnalya/contracts.
import { IDEMPOTENCY_KEY_HEADER } from '@bhojnalya/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed with status ${String(status)}`);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, parse: (body: unknown) => T): Promise<T> {
  const response = await fetch(new URL(path, window.location.origin), {
    headers: { Accept: 'application/json' },
  });
  return readResponse(response, parse);
}

/** POSTs JSON with the request's idempotency key (invariant 8, TRD §14). */
export async function apiPost<T>(
  path: string,
  body: unknown,
  parse: (body: unknown) => T,
  idempotencyKey: string,
): Promise<T> {
  const response = await fetch(new URL(path, window.location.origin), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [IDEMPOTENCY_KEY_HEADER]: idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  return readResponse(response, parse);
}

async function readResponse<T>(response: Response, parse: (body: unknown) => T): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return parse(body);
}

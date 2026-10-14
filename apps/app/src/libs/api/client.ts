// The one fetch wrapper. Paths are resolved against the page's origin, where
// Caddy (or the Vite dev proxy) serves the API. Every response body is handed
// to a parser, normally a Zod schema's `parse` from @bhojnalya/contracts.

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
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return parse(body);
}

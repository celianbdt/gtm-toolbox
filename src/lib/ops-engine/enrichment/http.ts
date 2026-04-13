/**
 * Shared HTTP helper for enrichment provider API calls.
 * Provides timeout, retry with backoff, rate limit detection, and error formatting.
 */

const DEFAULT_TIMEOUT = 10_000;
const MAX_RETRIES = 1;
const BACKOFF_MS = 2000;

export type FetchOptions = {
  timeout?: number;
  retries?: number;
};

export type FetchResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

export async function enrichFetch<T = unknown>(
  url: string,
  init: RequestInit,
  options?: FetchOptions
): Promise<FetchResult<T>> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxRetries = options?.retries ?? MAX_RETRIES;
  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeout),
      });

      // Rate limited — retry after backoff
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = res.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : BACKOFF_MS * (attempt + 1);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          status: res.status,
          data: null,
          error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const data = (await res.json()) as T;
      return { ok: true, status: res.status, data, error: null };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS * (attempt + 1)));
        continue;
      }
    }
  }

  return { ok: false, status: 0, data: null, error: lastError };
}

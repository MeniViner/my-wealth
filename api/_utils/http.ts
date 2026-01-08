/**
 * Shared HTTP utilities for Vercel Functions
 * Provides: timeout, retry with exponential backoff, request coalescing, safe JSON parsing
 */

// Global request coalescing map
declare global {
  var __inflight: Map<string, Promise<any>> | undefined;
}

const inflight = globalThis.__inflight || new Map<string, Promise<any>>();
if (!globalThis.__inflight) {
  globalThis.__inflight = inflight;
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: any
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

export class TimeoutError extends Error {
  constructor(public timeoutMs: number) {
    super(`Request timeout after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new TimeoutError(timeoutMs);
    }
    throw error;
  }
}

/**
 * Safe JSON parsing that detects HTML error pages
 */
export async function fetchJsonSafe(
  response: Response
): Promise<any> {
  const text = await response.text();

  // Check if response is HTML (error page)
  if (
    text.trim().startsWith('<!DOCTYPE') ||
    text.trim().startsWith('<html') ||
    text.trim().startsWith('<?xml')
  ) {
    throw new HttpError(
      response.status,
      response.statusText,
      'Received HTML instead of JSON'
    );
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    // Try to extract JSON from response if wrapped
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new HttpError(
          response.status,
          response.statusText,
          'Invalid JSON response'
        );
      }
    }
    throw new HttpError(
      response.status,
      response.statusText,
      'Could not parse JSON response'
    );
  }
}

/**
 * Retry with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelayMs = 1000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeoutMs: options.timeoutMs || 10000,
      });

      // Retry on 429 (rate limit) or 5xx errors
      if (
        response.status === 429 ||
        (response.status >= 500 && response.status < 600)
      ) {
        if (attempt < retries) {
          const delay = retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error: any) {
      lastError = error;

      // Don't retry on timeout or client errors (4xx except 429)
      if (
        error instanceof TimeoutError ||
        (error instanceof HttpError && error.status >= 400 && error.status < 500 && error.status !== 429)
      ) {
        throw error;
      }

      // Retry on network errors or server errors
      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Request coalescing: deduplicate concurrent identical requests
 */
export function fetchWithCoalescing(
  key: string,
  fetcher: () => Promise<Response>
): Promise<Response> {
  // Check if request is already in flight
  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  // Create new request
  const promise = fetcher()
    .then((response) => {
      inflight.delete(key);
      return response;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Combined fetch with all utilities
 */
export async function fetchReliable(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 10000, retries = 3, ...fetchOptions } = options;

  return fetchWithRetry(url, {
    ...fetchOptions,
    timeoutMs,
    retries,
  });
}

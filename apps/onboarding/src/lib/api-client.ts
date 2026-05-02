import { csrfFetch } from "./csrf";

type RequestOptions = {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
};

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY = 1_000;

async function request<T>(
  url: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, retryDelay * attempt));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await csrfFetch(url, {
        ...init,
        signal: controller.signal,
        credentials: "include",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const error = new ApiError(response.status, response.statusText, body);

        // Don't retry client errors (4xx) except 429
        if (response.status < 500 && response.status !== 429) {
          throw error;
        }
        lastError = error;
        continue;
      }

      if (response.status === 204) return undefined as T;
      return response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof ApiError) throw err;
      if ((err as Error).name === "AbortError") {
        lastError = new Error(`Request timed out after ${timeout}ms`);
        continue;
      }
      lastError = err as Error;
      continue;
    }
  }

  throw lastError ?? new Error("Request failed");
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { method: "GET" }, options),

  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      },
      options,
    ),

  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      url,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      },
      options,
    ),

  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      url,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      },
      options,
    ),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { method: "DELETE" }, options),
};

export { ApiError };
export type { RequestOptions };

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "../lib/api-client";

// Mock csrfFetch — it delegates to global fetch with CSRF headers attached
vi.mock("../lib/csrf", () => ({
  csrfFetch: (input: string, init?: RequestInit) => fetch(input, init),
}));

function mockResponse(
  status: number,
  body: unknown = null,
  statusText = "OK",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

describe("api-client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    const data = { id: 1, name: "test" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse(200, data),
    );

    const result = await api.get("/api/items");
    expect(result).toEqual(data);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns undefined for 204 No Content", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse(204),
    );

    const result = await api.delete("/api/items/1");
    expect(result).toBeUndefined();
  });

  it("throws ApiError on 4xx without retrying", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(404, { message: "Not found" }, "Not Found"),
    );

    const error = await api.get("/api/missing").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBe(404);
    // Should only call fetch once — no retry for 4xx
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry 400-level errors", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(422, { errors: ["invalid"] }, "Unprocessable Entity"),
    );

    await expect(api.post("/api/items", { bad: true })).rejects.toThrow(
      ApiError,
    );
    // Should only call once — no retry for 4xx
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx errors", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockResponse(503, null, "Service Unavailable"))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const promise = api.get("/api/health", { retryDelay: 100 });

    // Advance past retry delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 Too Many Requests", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockResponse(429, null, "Too Many Requests"))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const promise = api.get("/api/data", { retryDelay: 100 });

    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries on 5xx", async () => {
    vi.useRealTimers();

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(500, { error: "internal" }, "Internal Server Error"),
    );

    let caught: unknown;
    try {
      await api.get("/api/broken", { retries: 2, retryDelay: 10 });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as InstanceType<typeof ApiError>).status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("times out and retries on slow requests", async () => {
    vi.useRealTimers();

    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            signal.addEventListener("abort", () => {
              const err = new Error("Aborted");
              err.name = "AbortError";
              reject(err);
            });
          }
        });
      },
    );

    await expect(
      api.get("/api/slow", { timeout: 50, retries: 1, retryDelay: 10 }),
    ).rejects.toThrow("Request timed out after 50ms");

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sends JSON body with POST", async () => {
    const payload = { name: "New Item" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse(201, { id: 1, ...payload }),
    );

    await api.post("/api/items", payload);

    expect(fetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        credentials: "include",
      }),
    );
  });
});

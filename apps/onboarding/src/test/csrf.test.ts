import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCsrfToken, csrfFetch } from "#/lib/csrf";

describe("csrf", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getCsrfToken", () => {
    it("returns empty string when no cookie exists", () => {
      Object.defineProperty(document, "cookie", {
        value: "",
        writable: true,
        configurable: true,
      });
      expect(getCsrfToken()).toBe("");
    });

    it("reads __csrf cookie value", () => {
      Object.defineProperty(document, "cookie", {
        value: "other=abc; __csrf=my-token-123; session=xyz",
        writable: true,
        configurable: true,
      });
      expect(getCsrfToken()).toBe("my-token-123");
    });

    it("reads __csrf when it is the first cookie", () => {
      Object.defineProperty(document, "cookie", {
        value: "__csrf=first-value; other=abc",
        writable: true,
        configurable: true,
      });
      expect(getCsrfToken()).toBe("first-value");
    });
  });

  describe("csrfFetch", () => {
    it("does not add header for GET requests", async () => {
      Object.defineProperty(document, "cookie", {
        value: "__csrf=token123",
        writable: true,
        configurable: true,
      });
      await csrfFetch("/api/data");
      expect(fetch).toHaveBeenCalledWith("/api/data", undefined);
    });

    it("adds X-CSRF-Token header for POST requests", async () => {
      Object.defineProperty(document, "cookie", {
        value: "__csrf=token456",
        writable: true,
        configurable: true,
      });
      await csrfFetch("/api/data", { method: "POST" });
      const [, init] = (fetch as any).mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get("X-CSRF-Token")).toBe("token456");
    });

    it("adds X-CSRF-Token header for DELETE requests", async () => {
      Object.defineProperty(document, "cookie", {
        value: "__csrf=del-token",
        writable: true,
        configurable: true,
      });
      await csrfFetch("/api/item/1", { method: "DELETE" });
      const [, init] = (fetch as any).mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get("X-CSRF-Token")).toBe("del-token");
    });

    it("does not overwrite existing X-CSRF-Token header", async () => {
      Object.defineProperty(document, "cookie", {
        value: "__csrf=from-cookie",
        writable: true,
        configurable: true,
      });
      await csrfFetch("/api/data", {
        method: "POST",
        headers: { "X-CSRF-Token": "custom-value" },
      });
      const [, init] = (fetch as any).mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get("X-CSRF-Token")).toBe("custom-value");
    });

    it("does not add header for HEAD requests", async () => {
      Object.defineProperty(document, "cookie", {
        value: "__csrf=token789",
        writable: true,
        configurable: true,
      });
      await csrfFetch("/api/check", { method: "HEAD" });
      expect(fetch).toHaveBeenCalledWith("/api/check", { method: "HEAD" });
    });
  });
});

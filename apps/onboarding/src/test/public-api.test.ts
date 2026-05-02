import { beforeEach, describe, expect, it, vi } from "vitest";

describe("public-api", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getPublicApiBaseUrl", () => {
    it("returns empty string in browser when VITE_PUBLIC_API_URL is empty", async () => {
      vi.doMock("#/env", () => ({
        env: { VITE_PUBLIC_API_URL: "" },
      }));
      // window is defined in jsdom
      const { getPublicApiBaseUrl } = await import("#/lib/public-api");
      expect(getPublicApiBaseUrl()).toBe("");
    });

    it("returns the configured URL when VITE_PUBLIC_API_URL is set", async () => {
      vi.doMock("#/env", () => ({
        env: { VITE_PUBLIC_API_URL: "https://api.example.com/" },
      }));
      const { getPublicApiBaseUrl } = await import("#/lib/public-api");
      expect(getPublicApiBaseUrl()).toBe("https://api.example.com");
    });

    it("strips trailing slashes from configured URL", async () => {
      vi.doMock("#/env", () => ({
        env: { VITE_PUBLIC_API_URL: "https://api.example.com///" },
      }));
      const { getPublicApiBaseUrl } = await import("#/lib/public-api");
      expect(getPublicApiBaseUrl()).toBe("https://api.example.com");
    });

    it("returns SSR fallback when window is undefined and no explicit URL", async () => {
      vi.doMock("#/env", () => ({
        env: { VITE_PUBLIC_API_URL: "" },
      }));
      // Temporarily remove window to simulate SSR
      const originalWindow = globalThis.window;
      // @ts-expect-error - simulating SSR
      delete globalThis.window;
      const { getPublicApiBaseUrl } = await import("#/lib/public-api");
      const result = getPublicApiBaseUrl();
      globalThis.window = originalWindow;
      expect(result).toBe("http://127.0.0.1:3000");
    });
  });

  describe("publicApiUrl", () => {
    it("returns path as-is when base is empty (browser same-origin)", async () => {
      vi.doMock("#/env", () => ({
        env: { VITE_PUBLIC_API_URL: "" },
      }));
      const { publicApiUrl } = await import("#/lib/public-api");
      expect(publicApiUrl("/foo")).toBe("/foo");
    });

    it("prepends slash if path does not start with one", async () => {
      vi.doMock("#/env", () => ({
        env: { VITE_PUBLIC_API_URL: "" },
      }));
      const { publicApiUrl } = await import("#/lib/public-api");
      expect(publicApiUrl("foo")).toBe("/foo");
    });

    it("concatenates base URL with path", async () => {
      vi.doMock("#/env", () => ({
        env: { VITE_PUBLIC_API_URL: "https://api.example.com" },
      }));
      const { publicApiUrl } = await import("#/lib/public-api");
      expect(publicApiUrl("/api/users")).toBe(
        "https://api.example.com/api/users",
      );
    });
  });
});

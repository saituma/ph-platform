import { describe, expect, it } from "vitest";
import { isTokenExpired, msUntilExpiry, tokenExpiresAt } from "#/lib/token-expiry";

/** Create a minimal JWT with the given exp claim (no signature verification needed). */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.`;
}

describe("token-expiry", () => {
  describe("isTokenExpired", () => {
    it("returns true for null", () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it("returns true for empty string", () => {
      expect(isTokenExpired("")).toBe(true);
    });

    it("returns true for malformed token", () => {
      expect(isTokenExpired("not.a.jwt")).toBe(true);
    });

    it("returns true for expired JWT", () => {
      const expired = makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
      expect(isTokenExpired(expired)).toBe(true);
    });

    it("returns false for valid future JWT", () => {
      const future = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(isTokenExpired(future)).toBe(false);
    });

    it("returns false when no exp claim (treated as valid)", () => {
      const noExp = makeJwt({ sub: "user123" });
      expect(isTokenExpired(noExp)).toBe(false);
    });
  });

  describe("msUntilExpiry", () => {
    it("returns 0 for null", () => {
      expect(msUntilExpiry(null)).toBe(0);
    });

    it("returns 0 for expired token", () => {
      const expired = makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
      expect(msUntilExpiry(expired)).toBe(0);
    });

    it("returns -1 when no exp claim", () => {
      const noExp = makeJwt({ sub: "user123" });
      expect(msUntilExpiry(noExp)).toBe(-1);
    });

    it("returns positive ms for future token", () => {
      const future = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
      const ms = msUntilExpiry(future);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(3600 * 1000);
    });

    it("returns 0 for malformed token", () => {
      expect(msUntilExpiry("garbage")).toBe(0);
    });
  });

  describe("tokenExpiresAt", () => {
    it("returns null for null token", () => {
      expect(tokenExpiresAt(null)).toBeNull();
    });

    it("returns null when no exp claim", () => {
      const noExp = makeJwt({ sub: "user123" });
      expect(tokenExpiresAt(noExp)).toBeNull();
    });

    it("returns a Date for valid token with exp", () => {
      const exp = Math.floor(Date.now() / 1000) + 7200;
      const token = makeJwt({ exp });
      const result = tokenExpiresAt(token);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(exp * 1000);
    });

    it("returns null for malformed token", () => {
      expect(tokenExpiresAt("bad.token")).toBeNull();
    });
  });
});

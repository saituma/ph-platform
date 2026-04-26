/**
 * Lightweight JWT expiry check using the jose library.
 * Does NOT verify the signature — just reads the `exp` claim.
 * Signature verification happens on the server.
 */
import { decodeJwt } from "jose";

/** Returns true if the token is expired or malformed. */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = decodeJwt(token);
    if (typeof payload.exp !== "number") return false; // no expiry = treat as valid
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

/** Returns the expiry date, or null if the token has no exp claim or is malformed. */
export function tokenExpiresAt(token: string | null): Date | null {
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    if (typeof payload.exp !== "number") return null;
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

/** Milliseconds until the token expires. Returns 0 if already expired, -1 if no exp claim. */
export function msUntilExpiry(token: string | null): number {
  if (!token) return 0;
  try {
    const payload = decodeJwt(token);
    if (typeof payload.exp !== "number") return -1;
    return Math.max(0, payload.exp * 1000 - Date.now());
  } catch {
    return 0;
  }
}

const TRANSIENT_PG_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "ENOTFOUND"]);

/**
 * True when an error chain looks like Postgres / TCP dropped the connection
 * (Neon sleep, pooler idle close, bad SSL, network) — not an invalid token or SQL logic error.
 */
export function isLikelyDatabaseConnectivityFailure(err: unknown): boolean {
  let cur: unknown = err;
  for (let depth = 0; depth < 8 && cur; depth++) {
    if (typeof cur !== "object" || cur === null) {
      cur = undefined;
      break;
    }
    const o = cur as Record<string, unknown>;
    const code = typeof o.code === "string" ? o.code : undefined;
    if (code && TRANSIENT_PG_CODES.has(code)) return true;

    const msg = typeof o.message === "string" ? o.message : "";
    if (/ECONNRESET|ETIMEDOUT|ECONNREFUSED|EPIPE|connection terminated|Connection terminated unexpectedly/i.test(msg)) {
      return true;
    }

    cur = "cause" in o ? o.cause : undefined;
  }
  return false;
}

const RETRY_MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 200;

/**
 * Re-runs a DB read after short backoff when the driver reports a dropped connection
 * (common with Neon wake / pooler idle close). Does not retry business-logic errors.
 */
export async function withTransientDbRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const last = attempt === RETRY_MAX_ATTEMPTS - 1;
      if (!isLikelyDatabaseConnectivityFailure(err) || last) {
        throw err;
      }
      const delay = RETRY_BASE_MS * 2 ** attempt;
      console.warn(
        `[DB] ${label}: transient connection error (attempt ${attempt + 1}/${RETRY_MAX_ATTEMPTS}), retry in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

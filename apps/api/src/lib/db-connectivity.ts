const TRANSIENT_PG_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);
const DB_OUTAGE_COOLDOWN_MS = 10_000;

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
    if (
      /ECONNRESET|ETIMEDOUT|ECONNREFUSED|EPIPE|EHOSTUNREACH|ENETUNREACH|connection terminated|Connection terminated unexpectedly/i.test(
        msg,
      )
    ) {
      return true;
    }

    cur = "cause" in o ? o.cause : undefined;
  }
  return false;
}

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 150;
let dbOutageUntilMs = 0;

export function getDbOutageRemainingMs(): number {
  return Math.max(0, dbOutageUntilMs - Date.now());
}

export function isInDbOutageCooldown(): boolean {
  return getDbOutageRemainingMs() > 0;
}

function getDbOutageError(label: string) {
  const waitMs = getDbOutageRemainingMs();
  const error = new Error(
    `[DB] ${label}: skipping DB query during transient outage cooldown (${waitMs}ms remaining)`,
  ) as Error & { code?: string };
  error.code = "ECONNRESET";
  return error;
}

/**
 * Re-runs a DB read after short backoff when the driver reports a dropped connection
 * (common with Neon wake / pooler idle close). Does not retry business-logic errors.
 */
export async function withTransientDbRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return withTransientDbRetryConfigured(label, fn, {});
}

export async function withTransientDbRetryConfigured<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  if (Date.now() < dbOutageUntilMs) {
    throw getDbOutageError(label);
  }

  const maxAttempts = Math.max(1, Math.floor(options?.maxAttempts ?? RETRY_MAX_ATTEMPTS));
  const baseDelayMs = Math.max(0, Math.floor(options?.baseDelayMs ?? RETRY_BASE_MS));
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const value = await fn();
      dbOutageUntilMs = 0;
      return value;
    } catch (err) {
      lastErr = err;
      const last = attempt === maxAttempts - 1;
      if (!isLikelyDatabaseConnectivityFailure(err) || last) {
        if (isLikelyDatabaseConnectivityFailure(err)) {
          dbOutageUntilMs = Date.now() + DB_OUTAGE_COOLDOWN_MS;
        }
        throw err;
      }
      const delay = baseDelayMs * 2 ** attempt;
      console.warn(
        `[DB] ${label}: transient connection error (attempt ${attempt + 1}/${maxAttempts}), retry in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

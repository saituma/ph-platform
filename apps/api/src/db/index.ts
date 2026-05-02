import dns from "node:dns";
import net from "node:net";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "../config/env";
import { logger } from "../lib/logger";

dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

function normalizeConnectionString(raw: string) {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return raw;
  }
}

function maybePreferDirectNeonHost(raw: string): string {
  if (!env.databasePreferDirect) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (!host.includes("-pooler.")) return raw;
    url.hostname = url.hostname.replace("-pooler", "");
    return url.toString();
  } catch {
    return raw;
  }
}

/** Treat common hosted Postgres URLs as TLS even when DATABASE_SSL is unset (avoids ECONNRESET / failed handshakes). */
function connectionWantsSsl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const mode = (u.searchParams.get("sslmode") ?? "").toLowerCase();
    if (mode === "require" || mode === "verify-full" || mode === "verify-ca") return true;
    if (u.searchParams.get("ssl") === "true") return true;
    const host = u.hostname.toLowerCase();
    return (
      host.includes("neon.tech") ||
      host.includes("supabase.co") ||
      host.endsWith(".pooler.supabase.com") ||
      host.includes("render.com") ||
      host.includes(".database.azure.com")
    );
  } catch {
    return false;
  }
}

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const useSsl = Boolean(env.databaseSsl) || connectionWantsSsl(env.databaseUrl);
const chosenDatabaseUrl = maybePreferDirectNeonHost(env.databaseUrl);
const connectionString = useSsl ? normalizeConnectionString(chosenDatabaseUrl) : chosenDatabaseUrl;
const sslOption = useSsl ? (env.databaseSsl ?? { rejectUnauthorized: false }) : undefined;

/** Neon (pooler or direct): recycle clients before the proxy/server closes idle sockets (reduces ECONNRESET). */
const isNeonHost = (() => {
  try {
    return new URL(chosenDatabaseUrl).hostname.toLowerCase().includes("neon.tech");
  } catch {
    return false;
  }
})();

const poolConfig: ConstructorParameters<typeof Pool>[0] = {
  connectionString,
  ssl: sslOption,
  // Handshakes to hosted Postgres (especially poolers) can exceed 4s on congested links.
  // Use a slightly higher ceiling to avoid false outage trips while still failing fast enough.
  connectionTimeoutMillis: 7_500,
  query_timeout: 8_000,
  idleTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  max: 8,
  ...(isNeonHost
    ? {
        maxUses: 750,
        maxLifetimeSeconds: 60 * 60,
      }
    : {}),
};

if (isNeonHost) {
  const hostCursor = new Map<string, number>();
  // Dual-stack lookup for Neon: prefer alternating IPv6/IPv4 so we can
  // survive environments where one family is degraded.
  (poolConfig as any).lookup = (
    hostname: string,
    options: dns.LookupOneOptions,
    callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
  ) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        callback(err ?? new Error(`No address found for ${hostname}`), "", 4);
        return;
      }

      const requestedFamily =
        options && typeof options.family === "number" && (options.family === 4 || options.family === 6)
          ? options.family
          : 0;
      const candidates =
        requestedFamily === 4 || requestedFamily === 6
          ? addresses.filter((entry) => entry.family === requestedFamily)
          : addresses;
      const resolved = candidates.length > 0 ? candidates : addresses;

      const step = hostCursor.get(hostname) ?? 0;
      hostCursor.set(hostname, step + 1);
      const preferFamily = step % 2 === 0 ? 6 : 4;
      const preferred = resolved.filter((entry) => entry.family === preferFamily);
      const pool = preferred.length > 0 ? preferred : resolved;
      const selected = pool[step % pool.length];
      callback(null, selected.address, selected.family);
    });
  };
}

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  logger.error({ err }, "Pool idle client error");
});

if (env.databaseUrl !== chosenDatabaseUrl) {
  try {
    const fromHost = new URL(env.databaseUrl).hostname;
    const toHost = new URL(chosenDatabaseUrl).hostname;
    logger.info({ fromHost, toHost }, "Using direct Neon host in dev");
  } catch {
    logger.info("Using direct Neon host in dev");
  }
} else {
  try {
    const activeHost = new URL(chosenDatabaseUrl).hostname;
    logger.info({ host: activeHost }, "Active database host");
  } catch {
    // no-op
  }
}

export const db = drizzle(pool);

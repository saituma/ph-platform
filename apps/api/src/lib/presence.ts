/**
 * Presence tracking.
 *
 * Tracks which users are connected and which message thread each user is currently viewing.
 * Used to suppress push notifications when a recipient already has the conversation open, and
 * to show online dots in the clients.
 *
 * Backed by Redis when REDIS_URL is configured, otherwise by process-local maps.
 *
 * Redis matters for two reasons, not one:
 *   1. Multiple web dynos — a Set in one process cannot see users connected to another.
 *   2. The outbox worker dyno (worker.ts) re-checks presence at push-delivery time. It holds no
 *      sockets, so with process-local presence that check was always false there and the
 *      suppression silently never fired.
 *
 * ponytail: keys carry a TTL and are refreshed by one pipelined sweep per process, not a per-socket
 * heartbeat — a hard dyno crash leaves a user "online" for at most PRESENCE_TTL_SECONDS instead of
 * forever. Shrink the TTL if ghost-online after a crash ever becomes visible in practice; the cost
 * is one Redis op per online user per refresh.
 */
import type IORedis from "ioredis";
import { getRedisConnection } from "../jobs/connection";
import { logger } from "./logger";

const PRESENCE_TTL_SECONDS = 900;
const REFRESH_INTERVAL_MS = 600_000;

const onlineKey = (userId: number) => `presence:online:${userId}`;
const threadKey = (userId: number) => `presence:thread:${userId}`;

/** Local mirror. The fallback store when Redis is absent, and the refresh sweep's work list. */
const onlineUsers = new Set<number>();
const activeThreads = new Map<number, string>();

function redis(): IORedis | null {
  return getRedisConnection();
}

export async function markOnline(userId: number): Promise<void> {
  onlineUsers.add(userId);
  const client = redis();
  if (!client) return;
  try {
    await client.set(onlineKey(userId), "1", "EX", PRESENCE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, userId }, "presence.mark_online_failed");
  }
}

export async function markOffline(userId: number): Promise<void> {
  onlineUsers.delete(userId);
  activeThreads.delete(userId);
  const client = redis();
  if (!client) return;
  try {
    await client.del(onlineKey(userId), threadKey(userId));
  } catch (err) {
    logger.warn({ err, userId }, "presence.mark_offline_failed");
  }
}

export async function setActiveThread(userId: number, threadId: string | null): Promise<void> {
  const client = redis();
  if (threadId) {
    activeThreads.set(userId, threadId);
    if (!client) return;
    try {
      await client.set(threadKey(userId), threadId, "EX", PRESENCE_TTL_SECONDS);
    } catch (err) {
      logger.warn({ err, userId }, "presence.set_thread_failed");
    }
    return;
  }
  activeThreads.delete(userId);
  if (!client) return;
  try {
    await client.del(threadKey(userId));
  } catch (err) {
    logger.warn({ err, userId }, "presence.clear_thread_failed");
  }
}

/**
 * Returns true if the user has the given thread open.
 * threadId format matches what the clients send: a peer userId string for DMs, or "group:<id>".
 *
 * A Redis failure resolves to false — i.e. "not in the thread", so the push is SENT. An extra
 * notification is the safe side of this branch; a swallowed one is not.
 */
export async function isUserInThread(userId: number, threadId: string): Promise<boolean> {
  const client = redis();
  if (!client) return onlineUsers.has(userId) && activeThreads.get(userId) === threadId;
  try {
    return (await client.get(threadKey(userId))) === threadId;
  } catch (err) {
    logger.warn({ err, userId }, "presence.is_in_thread_failed");
    return false;
  }
}

/**
 * Which of `candidateIds` are currently online.
 *
 * Callers ask only about users they are entitled to see (your DM partners), so this never returns
 * the platform's online roster and the payload is bounded by who you talk to, not by N users.
 */
export async function getOnlineSubset(candidateIds: number[]): Promise<number[]> {
  if (!candidateIds.length) return [];
  const client = redis();
  if (!client) return candidateIds.filter((id) => onlineUsers.has(id));
  try {
    const values = await client.mget(candidateIds.map(onlineKey));
    return candidateIds.filter((_, index) => values[index] !== null);
  } catch (err) {
    logger.warn({ err }, "presence.online_subset_failed");
    return candidateIds.filter((id) => onlineUsers.has(id));
  }
}

/**
 * Re-arms the TTL on every user this process holds a socket for. One pipeline per sweep, so the
 * cost is one Redis op per online user per REFRESH_INTERVAL_MS — not per socket per ping.
 */
async function refreshLocalPresence(): Promise<void> {
  const client = redis();
  if (!client || onlineUsers.size === 0) return;
  try {
    const pipeline = client.pipeline();
    for (const userId of onlineUsers) {
      pipeline.expire(onlineKey(userId), PRESENCE_TTL_SECONDS);
      if (activeThreads.has(userId)) pipeline.expire(threadKey(userId), PRESENCE_TTL_SECONDS);
    }
    await pipeline.exec();
  } catch (err) {
    logger.warn({ err }, "presence.refresh_failed");
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function startPresenceRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    void refreshLocalPresence();
  }, REFRESH_INTERVAL_MS);
}

export function stopPresenceRefresh(): void {
  if (!refreshTimer) return;
  clearInterval(refreshTimer);
  refreshTimer = null;
}

/** Exposed for the leak test — users this process currently holds a socket for. */
export function onlineCount(): number {
  return onlineUsers.size;
}

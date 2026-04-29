import { apiRequest } from "@/lib/api";
import type {
  AdminDmThread,
  ChatGroup,
  DirectMessage,
  GroupMessage,
} from "@/types/admin-messages";
import { safeNumber } from "@/lib/admin-messages-utils";

const MESSAGE_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_PREFETCH_THREADS = 8;
const MAX_PARALLEL_PREFETCH = 2;

type CacheEntry<T> = {
  messages: T[];
  savedAt: number;
};

const dmCache = new Map<number, CacheEntry<DirectMessage>>();
const groupCache = new Map<number, CacheEntry<GroupMessage>>();
const dmInFlight = new Set<number>();
const groupInFlight = new Set<number>();
let warmCacheInFlight = false;

function isFresh(savedAt: number) {
  return Date.now() - savedAt < MESSAGE_CACHE_TTL_MS;
}

function dedupeById<T extends { id?: number; clientId?: string | null }>(
  messages: T[],
) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const message of messages) {
    const key =
      typeof message.id === "number"
        ? `id:${message.id}`
        : message.clientId
          ? `client:${message.clientId}`
          : JSON.stringify(message);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(message);
  }
  return result;
}

function readCache<T>(cache: Map<number, CacheEntry<T>>, id: number): T[] | null {
  const entry = cache.get(id);
  if (!entry) return null;
  if (!isFresh(entry.savedAt)) {
    cache.delete(id);
    return null;
  }
  return entry.messages;
}

export function getCachedAdminDmMessages(userId: number) {
  return readCache(dmCache, userId);
}

export function getCachedAdminGroupMessages(groupId: number) {
  return readCache(groupCache, groupId);
}

export function setCachedAdminDmMessages(
  userId: number,
  messages: DirectMessage[],
) {
  dmCache.set(userId, { messages: dedupeById(messages), savedAt: Date.now() });
}

export function setCachedAdminGroupMessages(
  groupId: number,
  messages: GroupMessage[],
) {
  groupCache.set(groupId, { messages: dedupeById(messages), savedAt: Date.now() });
}

export function appendCachedAdminDmMessage(userId: number, message: DirectMessage) {
  const current = dmCache.get(userId)?.messages ?? [];
  setCachedAdminDmMessages(userId, [...current, message]);
}

export function appendCachedAdminGroupMessage(
  groupId: number,
  message: GroupMessage,
) {
  const current = groupCache.get(groupId)?.messages ?? [];
  setCachedAdminGroupMessages(groupId, [...current, message]);
}

async function prefetchAdminDmMessages(token: string, userId: number) {
  if (dmInFlight.has(userId) || getCachedAdminDmMessages(userId)) return;
  dmInFlight.add(userId);
  try {
    const res = await apiRequest<{ messages?: DirectMessage[] }>(
      `/admin/messages/${userId}?limit=50`,
      {
        token,
        suppressLog: true,
        suppressStatusCodes: [401, 403, 404],
      },
    );
    setCachedAdminDmMessages(
      userId,
      Array.isArray(res?.messages) ? [...res.messages].reverse() : [],
    );
  } catch {
    // Prefetch is opportunistic; foreground open still handles errors.
  } finally {
    dmInFlight.delete(userId);
  }
}

async function prefetchAdminGroupMessages(token: string, groupId: number) {
  if (groupInFlight.has(groupId) || getCachedAdminGroupMessages(groupId)) return;
  groupInFlight.add(groupId);
  try {
    const res = await apiRequest<{ messages?: GroupMessage[] }>(
      `/chat/groups/${groupId}/messages?limit=100`,
      {
        token,
        suppressLog: true,
        suppressStatusCodes: [401, 403, 404],
      },
    );
    setCachedAdminGroupMessages(
      groupId,
      Array.isArray(res?.messages) ? [...res.messages].reverse() : [],
    );
  } catch {
    // Prefetch is opportunistic; foreground open still handles errors.
  } finally {
    groupInFlight.delete(groupId);
  }
}

async function runLimited<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = MAX_PARALLEL_PREFETCH,
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const next = items[cursor];
      cursor += 1;
      await worker(next);
    }
  });
  await Promise.all(runners);
}

function rankDmThreads(threads: AdminDmThread[]) {
  return [...threads]
    .filter((thread) => Number.isFinite(Number(thread.userId)))
    .sort((a, b) => {
      const unreadDelta = safeNumber(b.unread) - safeNumber(a.unread);
      if (unreadDelta !== 0) return unreadDelta;
      const aTime = a.time ? new Date(a.time).getTime() : 0;
      const bTime = b.time ? new Date(b.time).getTime() : 0;
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    })
    .slice(0, MAX_PREFETCH_THREADS);
}

function rankGroups(groups: ChatGroup[], category?: "team" | "announcement") {
  return [...groups]
    .filter((group) => {
      if (!Number.isFinite(Number(group.id))) return false;
      if (!category) return true;
      return String(group.category ?? "").toLowerCase() === category;
    })
    .sort((a, b) => {
      const unreadDelta = safeNumber(b.unreadCount) - safeNumber(a.unreadCount);
      if (unreadDelta !== 0) return unreadDelta;
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    })
    .slice(0, MAX_PREFETCH_THREADS);
}

export function prefetchAdminDmThreadMessages(
  token: string | null,
  threads: AdminDmThread[],
) {
  if (!token || threads.length === 0) return;
  const ranked = rankDmThreads(threads);
  void runLimited(ranked, (thread) =>
    prefetchAdminDmMessages(token, Number(thread.userId)),
  );
}

export function prefetchAdminGroupThreadMessages(
  token: string | null,
  groups: ChatGroup[],
  category?: "team" | "announcement",
) {
  if (!token || groups.length === 0) return;
  const ranked = rankGroups(groups, category);
  void runLimited(ranked, (group) =>
    prefetchAdminGroupMessages(token, Number(group.id)),
  );
}

export async function warmAdminMessagesCache(token: string | null) {
  if (!token || warmCacheInFlight) return;
  warmCacheInFlight = true;
  try {
    const [dmRes, groupRes] = await Promise.all([
      apiRequest<{ threads?: AdminDmThread[] }>("/admin/messages/threads?limit=80", {
        token,
        suppressLog: true,
        suppressStatusCodes: [401, 403],
      }).catch(() => null),
      apiRequest<{ groups?: ChatGroup[] }>("/chat/groups?limit=100", {
        token,
        suppressLog: true,
        suppressStatusCodes: [401, 403],
      }).catch(() => null),
    ]);

    const dmThreads = Array.isArray(dmRes?.threads) ? dmRes.threads : [];
    const groups = Array.isArray(groupRes?.groups) ? groupRes.groups : [];
    prefetchAdminDmThreadMessages(token, dmThreads);
    prefetchAdminGroupThreadMessages(token, groups, "team");
    prefetchAdminGroupThreadMessages(token, groups, "announcement");
  } finally {
    warmCacheInFlight = false;
  }
}

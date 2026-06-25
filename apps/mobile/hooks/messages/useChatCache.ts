import { MessageThread, TypingStatus } from "@/types/messages";
import { ChatMessage } from "@/constants/messages";
import { loadCacheSync, saveCacheToDb } from "@/lib/db/messageDb";

export type MessagesControllerCache = {
  threads: MessageThread[];
  messages: ChatMessage[];
  groupMembers: Record<
    number,
    Record<number, { name: string; avatar?: string | null }>
  >;
  typingStatus: TypingStatus;
  selectedThread: MessageThread | null;
  draft: string;
  updatedAtMs: number;
};

export const MESSAGES_CACHE_TTL_MS = 1000 * 60 * 15;
export const messagesControllerCacheByProfileId = new Map<
  number,
  MessagesControllerCache
>();

function pruneExpiredCacheEntries(now = Date.now()) {
  for (const [profileId, cached] of messagesControllerCacheByProfileId) {
    if (now - cached.updatedAtMs > MESSAGES_CACHE_TTL_MS) {
      messagesControllerCacheByProfileId.delete(profileId);
    }
  }
}

export function getInitialCache(profileId: number): MessagesControllerCache | null {
  const now = Date.now();

  // 1. In-memory Map — fastest, same JS session.
  const mem = messagesControllerCacheByProfileId.get(profileId);
  if (mem && now - mem.updatedAtMs < MESSAGES_CACHE_TTL_MS) return mem;

  // 2. SQLite synchronous read — survives app kills.
  //    This is the "WhatsApp trick": data is available before the first render
  //    so isLoading starts false and threads appear instantly on cold start.
  const dbData = loadCacheSync(profileId);
  if (dbData) {
    const cache: MessagesControllerCache = {
      ...dbData,
      typingStatus: {},
      selectedThread: null,
      draft: "",
      // Mark slightly stale so TanStack Query triggers a background API sync.
      updatedAtMs: now - 60_000,
    };
    messagesControllerCacheByProfileId.set(profileId, cache);
    return cache;
  }

  return null;
}

/** Immediately syncs current state into the in-memory Map so any component
 *  that calls getInitialCache() sees fresh data without waiting for the
 *  2-second SQLite debounce to fire. */
export function updateMemoryCache(
  profileId: number,
  data: Omit<MessagesControllerCache, "updatedAtMs">,
) {
  if (!Number.isFinite(profileId) || profileId <= 0) return;
  messagesControllerCacheByProfileId.set(profileId, {
    ...data,
    updatedAtMs: Date.now(),
  });
}

export function saveToCache(profileId: number, data: Omit<MessagesControllerCache, "updatedAtMs">) {
  if (!Number.isFinite(profileId) || profileId <= 0) return;
  pruneExpiredCacheEntries();

  const entry: MessagesControllerCache = { ...data, updatedAtMs: Date.now() };

  // 1. Update in-memory immediately.
  messagesControllerCacheByProfileId.set(profileId, entry);

  // 2. Persist to SQLite — fire-and-forget so it never blocks the UI.
  void saveCacheToDb(profileId, {
    threads: data.threads,
    messages: data.messages,
    groupMembers: data.groupMembers,
  });
}

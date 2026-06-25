import { MessageThread, TypingStatus } from "@/types/messages";
import { ChatMessage } from "@/constants/messages";

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

export function getInitialCache(profileId: number) {
  const now = Date.now();
  const cached = messagesControllerCacheByProfileId.get(profileId);
  if (!cached) return null;
  if (now - cached.updatedAtMs > MESSAGES_CACHE_TTL_MS) {
    messagesControllerCacheByProfileId.delete(profileId);
    return null;
  }
  return cached;
}

export function saveToCache(profileId: number, data: Omit<MessagesControllerCache, "updatedAtMs">) {
  if (!Number.isFinite(profileId) || profileId <= 0) return;
  pruneExpiredCacheEntries();
  messagesControllerCacheByProfileId.set(profileId, {
    ...data,
    updatedAtMs: Date.now(),
  });
}

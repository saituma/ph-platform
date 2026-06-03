export type MessagingUnreadChange = {
  threadId?: string;
  unreadCleared?: number;
};

type Listener = (event: MessagingUnreadChange) => void;

const listeners = new Set<Listener>();
const locallyReadThreads = new Map<string, number>();
const LOCAL_READ_TTL_MS = 2 * 60 * 1000;

function normalizeThreadId(threadId?: string | number | null) {
  const raw = String(threadId ?? "").trim();
  if (!raw) return null;
  return raw.startsWith("direct:") ? raw.replace(/^direct:/, "") : raw;
}

function pruneLocalReads(now = Date.now()) {
  for (const [threadId, readAt] of locallyReadThreads) {
    if (now - readAt > LOCAL_READ_TTL_MS) {
      locallyReadThreads.delete(threadId);
    }
  }
}

export function isMessagingThreadLocallyRead(threadId?: string | number | null) {
  pruneLocalReads();
  const normalized = normalizeThreadId(threadId);
  if (!normalized) return false;
  return locallyReadThreads.has(normalized);
}

export function emitMessagingUnreadChanged(event: MessagingUnreadChange = {}) {
  const normalized = normalizeThreadId(event.threadId);
  if (normalized) {
    locallyReadThreads.set(normalized, Date.now());
  }
  for (const listener of [...listeners]) {
    listener(event);
  }
}

export function subscribeMessagingUnreadChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

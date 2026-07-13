/**
 * In-process presence tracking.
 *
 * Tracks which users are connected and which message thread each user is
 * currently viewing. Used to suppress push notifications when a recipient
 * already has the conversation open.
 *
 * Single-instance only. In multi-instance deployments this is per-process;
 * the Redis Socket.IO adapter handles the broadcast side already, but cross-
 * instance presence queries would need a Redis key set — upgrade path if needed.
 */

const onlineUsers = new Set<number>();

// userId → thread key ("42" for DM with user 42, "group:7" for group 7)
const activeThreads = new Map<number, string>();

export function markOnline(userId: number): void {
  onlineUsers.add(userId);
}

export function markOffline(userId: number): void {
  onlineUsers.delete(userId);
  activeThreads.delete(userId);
}

export function setActiveThread(userId: number, threadId: string | null): void {
  if (threadId) {
    activeThreads.set(userId, threadId);
  } else {
    activeThreads.delete(userId);
  }
}

export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

/**
 * Returns true if the user is online AND has the given thread open.
 * threadId format matches what the mobile sends: a peer userId string for DMs,
 * or "group:<id>" for group chats.
 */
export function isUserInThread(userId: number, threadId: string): boolean {
  return onlineUsers.has(userId) && activeThreads.get(userId) === threadId;
}

/**
 * Which of `candidateIds` are currently online.
 *
 * Replaces getOnlineUserIds(), which returned EVERY online user id on the server. That array was
 * pushed to every client on every connect (`presence:snapshot`) — an O(N) payload to each of N
 * clients, and it leaked the entire platform's online roster to every athlete. Callers now ask
 * only about the users they are entitled to see.
 */
export function getOnlineSubset(candidateIds: number[]): number[] {
  return candidateIds.filter((id) => onlineUsers.has(id));
}

/** Exposed for the leak test — the number of users currently marked online on this process. */
export function onlineCount(): number {
  return onlineUsers.size;
}

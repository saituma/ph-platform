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

export function getOnlineUserIds(): number[] {
  return Array.from(onlineUsers);
}

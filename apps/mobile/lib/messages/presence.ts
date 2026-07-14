/** The literal the UI treats as "online" — the dot keys off this exact string. */
export const ONLINE_LABEL = "Online";

/**
 * The status line under a peer's name.
 *
 * Never returns a cheerful default: a peer we have no lastSeenAt for is "Offline", not "Active".
 * The old placeholder said "Active" for anyone who had never connected, which read as presence
 * and was simply false.
 */
export function formatPresence(isOnline: boolean, lastSeenAt?: string | null): string {
  if (isOnline) return ONLINE_LABEL;
  if (!lastSeenAt) return "Offline";

  const elapsedMs = Date.now() - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "Offline";

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Last seen yesterday";
  return `Last seen ${days}d ago`;
}

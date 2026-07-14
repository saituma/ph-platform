/** Wording mirrors apps/mobile/hooks/messages/useChatActions.ts so both clients read the same. */
export function formatPresence(isOnline: boolean, lastSeenAt: string | null): string {
  if (isOnline) return "Active now";
  if (!lastSeenAt) return "Offline";

  const elapsedMs = Date.now() - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "Offline";

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Last seen yesterday";
  return `Last seen ${days}d ago`;
}

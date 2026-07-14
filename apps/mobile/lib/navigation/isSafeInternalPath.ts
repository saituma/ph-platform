/** Guards against navigating to an external, malformed, or empty path from server-controlled data (push payloads, notification `link` fields). */
export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url || url === "/") return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (url.includes("://")) return false;
  if (url.includes("..")) return false;
  return true;
}

/** Historical notification rows in the DB still hold links to routes the app has since removed. */
const LEGACY_LINK_REMAP: Record<string, string> = {
  "/plans": "/(tabs)/programs",
};

export function remapLegacyNotificationLink(link: string): string {
  return LEGACY_LINK_REMAP[link] ?? link;
}

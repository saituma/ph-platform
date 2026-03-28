/**
 * Browser notification permission: we only auto-prompt once per profile (localStorage).
 * After allow/deny, the browser owns the decision; we never spam requestPermission() on each visit.
 * Cleared on logout so a new account can be asked once.
 */
export const DESKTOP_NOTIFICATION_PROMPT_KEY = "ph_web_desktop_notification_prompt_shown";

export function maybeRequestDesktopNotificationPermissionOnce(): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    if (localStorage.getItem(DESKTOP_NOTIFICATION_PROMPT_KEY)) return;
    localStorage.setItem(DESKTOP_NOTIFICATION_PROMPT_KEY, "1");
  } catch {
    return;
  }
  void Notification.requestPermission().catch(() => undefined);
}

export function clearDesktopNotificationPromptFlag(): void {
  try {
    localStorage.removeItem(DESKTOP_NOTIFICATION_PROMPT_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

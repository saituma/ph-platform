type EventName =
  | "page_view"
  | "sign_up_start"
  | "sign_up_complete"
  | "login_success"
  | "login_failure"
  | "plan_selected"
  | "enquiry_submitted"
  | "portal_accessed";

type EventProperties = Record<string, string | number | boolean>;

export function trackEvent(name: EventName, properties?: EventProperties) {
  // Send to PostHog/Mixpanel when configured, otherwise log in dev
  if (typeof window === "undefined") return;
  if (import.meta.env.DEV) {
    console.debug("[analytics]", name, properties);
    return;
  }
  // Future: window.posthog?.capture(name, properties)
}

export function identifyUser(userId: string, traits?: Record<string, string>) {
  if (typeof window === "undefined") return;
  if (import.meta.env.DEV) {
    console.debug("[analytics:identify]", userId, traits);
    return;
  }
}

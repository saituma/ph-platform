import * as Sentry from "@sentry/tanstackstart-react";

type EventName =
  | "page_view"
  | "sign_up_start"
  | "sign_up_complete"
  | "login_success"
  | "login_failure"
  | "plan_selected"
  | "enquiry_submitted"
  | "portal_accessed"
  | "onboarding_step"
  | "navigation"
  | "error_shown";

type EventProperties = Record<string, string | number | boolean>;

export function trackEvent(name: EventName, properties?: EventProperties) {
  if (typeof window === "undefined") return;

  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category: "analytics",
      message: name,
      data: properties,
      level: "info",
    });
  }
}

export function identifyUser(userId: string, traits?: Record<string, string>) {
  if (typeof window === "undefined") return;

  if (import.meta.env.PROD) {
    Sentry.setUser({ id: userId, ...traits });
  }
}

export function clearIdentity() {
  if (typeof window === "undefined") return;
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
}

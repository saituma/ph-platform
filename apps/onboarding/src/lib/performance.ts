import * as Sentry from "@sentry/tanstackstart-react";

/**
 * Measure a critical user flow as a Sentry transaction.
 * Usage: const end = startTransaction("onboarding.step1"); ... end();
 */
export function startTransaction(name: string, op = "ui.action") {
  const span = Sentry.startInactiveSpan({ name, op });
  return () => span?.end();
}

/**
 * Track a specific metric value.
 */
export function recordMetric(name: string, value: number, unit: "millisecond" | "byte" | "none" = "none") {
  Sentry.metrics?.distribution(name, value, { unit });
}

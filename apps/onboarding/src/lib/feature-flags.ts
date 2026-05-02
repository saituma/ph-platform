/**
 * Feature Flags System
 *
 * PostHog Integration Guide:
 * --------------------------
 * 1. Add the PostHog script to your root layout/index.html:
 *    <script>
 *      !function(t,e){...}(document,window); // PostHog snippet
 *      posthog.init('YOUR_PROJECT_API_KEY', { api_host: 'https://app.posthog.com' });
 *    </script>
 *
 * 2. Uncomment the PostHog check in `isFeatureEnabled` below.
 *
 * 3. Create matching feature flags in your PostHog dashboard with the same
 *    string keys used in the FeatureFlag type.
 *
 * 4. For the React hook, swap to `useSyncExternalStore` subscribing to
 *    posthog.onFeatureFlags() for reactive updates when flags load async.
 */

type FeatureFlag =
  | "new_onboarding_flow"
  | "enhanced_analytics"
  | "offline_mode"
  | "team_chat_v2"
  | "nutrition_ai";

type FlagOverrides = Partial<Record<FeatureFlag, boolean>>;

// Local overrides for development (set via console: window.__FF_OVERRIDES = { flag: true })
function getLocalOverrides(): FlagOverrides {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("ph_feature_flags");
    if (stored) return JSON.parse(stored);
    return (window as any).__FF_OVERRIDES ?? {};
  } catch {
    return {};
  }
}

// Default flag values (shipped with the code — change these to roll out)
const FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  new_onboarding_flow: false,
  enhanced_analytics: false,
  offline_mode: false,
  team_chat_v2: false,
  nutrition_ai: false,
};

/**
 * Check if a feature flag is enabled.
 * Priority: local override > PostHog (future) > default
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const overrides = getLocalOverrides();
  if (flag in overrides) return overrides[flag]!;

  // Future: check PostHog
  // if (typeof window !== "undefined" && (window as any).posthog?.isFeatureEnabled) {
  //   const remote = (window as any).posthog.isFeatureEnabled(flag);
  //   if (remote !== undefined) return remote;
  // }

  return FLAG_DEFAULTS[flag];
}

/**
 * React hook for feature flags (triggers re-render if flag changes)
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  // For now, flags are static per page load
  // When PostHog is integrated, this will use useSyncExternalStore
  return isFeatureEnabled(flag);
}

/**
 * Set a local override (for testing in dev)
 */
export function setFlagOverride(flag: FeatureFlag, value: boolean): void {
  if (typeof window === "undefined") return;
  const current = getLocalOverrides();
  current[flag] = value;
  localStorage.setItem("ph_feature_flags", JSON.stringify(current));
}

/**
 * Clear all local overrides
 */
export function clearFlagOverrides(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ph_feature_flags");
}

export type { FeatureFlag };

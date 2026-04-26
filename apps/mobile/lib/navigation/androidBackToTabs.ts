import { type Href, type Router } from "expo-router";

const TABS_FALLBACK = "/(tabs)" as Href;

/**
 * Routes opened as root-stack pushes from the main tab shell. When the OS stack
 * has nothing to pop (deep link, or navigator quirk), Android back would exit
 * the app — we fall back to the tab shell instead.
 *
 * Any route outside the tab group qualifies: admin screens, program screens,
 * schedule modals, message threads, etc.
 */
export function shouldAndroidFallbackToTabs(pathname: string | null): boolean {
  if (!pathname) return false;
  // Routes inside the tab shell are handled by their own stack navigators.
  // At the tab root with nothing to pop, closing the app is correct.
  if (pathname.startsWith("/(tabs)")) return false;
  // Everything else was pushed above the tab shell — go back there instead.
  return true;
}

export function goBackOrFallbackTabs(
  router: Router,
  pathname: string | null,
): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  if (shouldAndroidFallbackToTabs(pathname)) {
    router.replace(TABS_FALLBACK);
  }
}

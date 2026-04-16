import { type Href, type Router } from "expo-router";

const TABS_FALLBACK = "/(tabs)" as Href;

/**
 * Routes opened as root-stack pushes from the main tab shell. When the OS stack
 * has nothing to pop (deep link, or navigator quirk), Android back would exit
 * the app — we fall back to the tab shell instead.
 */
export function shouldAndroidFallbackToTabs(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/(tabs)")) return false;
  const p = pathname;
  return (
    p.startsWith("/admin") ||
    p.includes("admin-teams") ||
    p.includes("admin-audience-workspace")
  );
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

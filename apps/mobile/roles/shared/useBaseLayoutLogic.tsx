import { useCallback, useMemo } from "react";
import { TabConfig } from "@/components/navigation";
import React from "react";
import { useSafePathname, useSafeRouter } from "@/hooks/navigation/useSafeExpoRouter";

/** Tab keys that match a file under `app/(tabs)/` — admin/coach shells use other keys; do not `router.replace` those. */
const TABS_SHELL_ROUTE_KEYS = new Set([
  "index",
  "programs",
  "messages",
  "schedule",
  "tracking",
  "more",
]);

/** First segment under (tabs), aligned with tab keys (index = home). */
export function parsePrimaryTabSegment(pathname: string): string {
  if (!pathname) return "index";
  const normalizedPath = pathname.replace(/^\//, "").replace(/^\(tabs\)\/?/, "");
  const segments = normalizedPath.split("/").filter(Boolean);

  let routeName = segments[0] || "index";

  if (
    (routeName === "team" ||
      routeName === "adult" ||
      routeName === "youth" ||
      routeName === "admin") &&
    segments[1] === "messages"
  ) {
    routeName = "messages";
  }

  return routeName;
}

export function useBaseLayoutLogic(visibleTabs: TabConfig[], tabComponents: Record<string, React.ComponentType<any>>) {
  const pathname = useSafePathname("");
  const router = useSafeRouter();

  const initialIndex = useMemo(() => {
    // Avoid falling back to stale module state when the pathname is briefly empty.
    if (!pathname) {
      return 0;
    }

    const routeName = parsePrimaryTabSegment(pathname);
    const index = visibleTabs.findIndex((tab) => tab.key === routeName);
    return index >= 0 ? index : 0;
  }, [pathname, visibleTabs]);

  const handleIndexChange = useCallback(
    (index: number, _source: "swipe" | "press" | "sync") => {
      const tab = visibleTabs[index];
      if (!tab || !router) return;
      if (!TABS_SHELL_ROUTE_KEYS.has(tab.key)) return;

      const current = parsePrimaryTabSegment(pathname);
      if (current === tab.key) return;

      const href = tab.key === "index" ? "/(tabs)" : `/(tabs)/${tab.key}`;
      router.replace(href as Parameters<typeof router.replace>[0]);
    },
    [visibleTabs, pathname, router],
  );

  const screens = useMemo(() => {
    return visibleTabs.map((tab) => {
      const Component = tabComponents[tab.key];
      return <Component key={tab.key} />;
    });
  }, [visibleTabs, tabComponents]);

  return { initialIndex, handleIndexChange, screens };
}

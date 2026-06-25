import { useCallback, useMemo, useRef } from "react";
import { TabConfig } from "@/components/navigation";
import React from "react";
import { useSafePathname } from "@/hooks/navigation/useSafeExpoRouter";

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
  const lastResolvedRef = useRef<{ pathname: string; index: number } | null>(null);

  const initialIndex = useMemo(() => {
    // Push screens live outside /(tabs)/ — don't recompute the active tab
    // when the root Stack navigates to a push screen like /messages/123 or
    // /programs/content/5. The SwipeableTabLayout preserves its own activeIndex
    // state through push/pop cycles, so we just keep the last known tab index.
    if (pathname && !pathname.startsWith("/(tabs)")) {
      return lastResolvedRef.current?.index ?? 0;
    }

    if (!pathname) return lastResolvedRef.current?.index ?? 0;

    const routeName = parsePrimaryTabSegment(pathname);
    const index = visibleTabs.findIndex((tab) => tab.key === routeName);

    if (index >= 0) {
      lastResolvedRef.current = { pathname, index };
      return index;
    }

    // visibleTabs changed but the current tab key isn't in the new list yet —
    // keep the previous index instead of snapping to 0.
    if (lastResolvedRef.current !== null) {
      return Math.min(lastResolvedRef.current.index, visibleTabs.length - 1);
    }

    return 0;
  }, [pathname, visibleTabs]);

  // No router.replace — calling router.replace("/(tabs)/programs") from here was
  // the source of the "double redirect": Expo Router's route replacement fired a
  // visible navigation event 250 ms after every tab press. Tab visual state is
  // managed entirely by SwipeableTabLayout's activeIndex React state, which is
  // preserved through push/pop navigation cycles without any URL sync needed.
  // Deep links still work: they call router.replace themselves, which updates
  // pathname and triggers the initialIndex sync effect in SwipeableTabLayout.
  const handleIndexChange = useCallback(
    (_index: number, _source: "swipe" | "press" | "sync") => {},
    [],
  );

  const screens = useMemo(() => {
    return visibleTabs.map((tab) => {
      const Component = tabComponents[tab.key];
      return <Component key={tab.key} />;
    });
  }, [visibleTabs, tabComponents]);

  return { initialIndex, handleIndexChange, screens };
}

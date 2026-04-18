import { useCallback, useMemo } from "react";
import { TabConfig } from "@/components/navigation";
import React from "react";
import { useSafePathname } from "@/hooks/navigation/useSafeExpoRouter";

let lastTabKey = "index";

export function useBaseLayoutLogic(visibleTabs: TabConfig[], tabComponents: Record<string, React.ComponentType<any>>) {
  const pathname = useSafePathname("");

  const initialIndex = useMemo(() => {
    const storedIndex = visibleTabs.findIndex((tab) => tab.key === lastTabKey);

    if (!pathname) {
      return storedIndex >= 0 ? storedIndex : 0;
    }

    // Expo Router hides route groups in the URL, so tabs can be:
    // - "/" (Home)
    // - "/programs", "/messages", "/schedule", "/more"
    // - "/tracking/..." (nested)
    // Also accept internal paths that still include the group: "/(tabs)/programs".
    const normalizedPath = pathname.replace(/^\//, "").replace(/^\(tabs\)\/?/, "");
    const segments = normalizedPath.split("/").filter(Boolean);

    let routeName = segments[0] || "index";

    // Role-prefixed message routes should still select the Messages tab.
    if (
      (routeName === "team" ||
        routeName === "adult" ||
        routeName === "youth" ||
        routeName === "admin") &&
      segments[1] === "messages"
    ) {
      routeName = "messages";
    }

    const index = visibleTabs.findIndex((tab) => tab.key === routeName);
    const resolvedIndex = index >= 0 ? index : 0;
    lastTabKey = visibleTabs[resolvedIndex]?.key ?? "index";
    return resolvedIndex;
  }, [pathname, visibleTabs]);

  const handleIndexChange = useCallback(
    (index: number, _source: "swipe" | "press" | "sync") => {
      const tab = visibleTabs[index];
      if (!tab) return;
      lastTabKey = tab.key;
    },
    [visibleTabs],
  );

  const screens = useMemo(() => {
    return visibleTabs.map((tab) => {
      const Component = tabComponents[tab.key];
      return <Component key={tab.key} />;
    });
  }, [visibleTabs, tabComponents]);

  return { initialIndex, handleIndexChange, screens };
}

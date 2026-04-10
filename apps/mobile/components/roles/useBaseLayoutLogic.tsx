import { useCallback, useMemo } from "react";
import { usePathname } from "expo-router";
import { TabConfig } from "@/components/navigation";
import React from "react";

let lastTabKey = "index";

export function useBaseLayoutLogic(visibleTabs: TabConfig[], tabComponents: Record<string, React.ComponentType<any>>) {
  const pathname = usePathname();

  const initialIndex = useMemo(() => {
    if (!pathname.startsWith("/(tabs)")) {
      const storedIndex = visibleTabs.findIndex(
        (tab) => tab.key === lastTabKey,
      );
      return storedIndex >= 0 ? storedIndex : 0;
    }
    const normalizedPath = pathname
      .replace(/^\//, "")
      .replace(/^\(tabs\)\/?/, "");
    const routeName = normalizedPath.split("/")[0] || "index";

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

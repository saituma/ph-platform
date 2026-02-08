import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { SwipeableTabLayout, TabConfig } from "@/components/navigation";
import { useRole } from "@/context/RoleContext";
import { Slot, usePathname, useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { InteractionManager, Platform } from "react-native";

import HomeScreen from "./index";
import MessagesScreen from "./messages";
import MoreScreen from "./more";
import ParentPlatformScreen from "./parent-platform";
import ProgramsScreen from "./programs";
import ScheduleScreen from "./schedule";

const TAB_ROUTES: TabConfig[] = [
  { key: "index", label: "Home", icon: "home" },
  { key: "programs", label: "Programs", icon: "activity" },
  { key: "messages", label: "Messages", icon: "message-square" },
  { key: "parent-platform", label: "Parent", icon: "book" },
  { key: "schedule", label: "Schedule", icon: "calendar" },
  { key: "more", label: "More", icon: "menu" },
];

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  "parent-platform": React.memo(ParentPlatformScreen),
  schedule: React.memo(ScheduleScreen),
  more: React.memo(MoreScreen),
};

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { role } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const pendingNavToken = useRef(0);

  const isOnboarding =
    segments.some((segment) => segment === "onboarding") ||
    pathname.includes("/onboarding");

  const visibleTabs = useMemo(() => {
    if (role === "Athlete") {
      return TAB_ROUTES.filter((tab) => tab.key !== "parent-platform");
    }
    return TAB_ROUTES;
  }, [role]);

  const initialIndex = useMemo(() => {
    // Normalize path by removing leading slash and (tabs) group
    const normalizedPath = pathname
      .replace(/^\//, "")
      .replace(/^\(tabs\)\/?/, "");
    const routeName = normalizedPath.split("/")[0] || "index";

    const index = visibleTabs.findIndex((tab) => tab.key === routeName);
    return index >= 0 ? index : 0;
  }, [pathname, visibleTabs]);

  const handleIndexChange = useCallback(
    (index: number, source: "swipe" | "press" | "sync") => {
      const tab = visibleTabs[index];
      if (!tab) return;

      if (source === "swipe") {
        return;
      }

      // Extract current tab key to avoid redundant navigation
      const relativePart = pathname.replace(/^\/\(tabs\)\/?/, "");
      const currentTabKey = relativePart.split("/")[0] || "index";

      if (tab.key !== currentTabKey) {
        const path = tab.key === "index" ? "/(tabs)" : `/(tabs)/${tab.key}`;
        // Avoid native flicker by not replacing the route on device.
        if (Platform.OS !== "web") {
          return;
        }

        // Defer navigation so the gesture stays responsive.
        const token = ++pendingNavToken.current;
        InteractionManager.runAfterInteractions(() => {
          if (token !== pendingNavToken.current) return;
          router.replace(path as any);
        });
      }
    },
    [visibleTabs, router, pathname],
  );

  const screens = useMemo(() => {
    return visibleTabs.map((tab) => {
      const Component = TAB_COMPONENTS[tab.key];
      // Return component directly to avoid double wrapping with PagerView's container
      return <Component key={tab.key} />;
    });
  }, [visibleTabs]); // visibleTabs only changes when role changes

  if (isOnboarding) {
    return <Slot />;
  }

  return (
    <SwipeableTabLayout
      tabs={visibleTabs}
      initialIndex={initialIndex}
      onIndexChange={handleIndexChange}
    >
      {screens}
    </SwipeableTabLayout>
  );
}

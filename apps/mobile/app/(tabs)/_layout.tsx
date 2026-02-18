import { SwipeableTabLayout, TabConfig } from "@/components/navigation";
import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { Redirect, Slot, usePathname, useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, Platform } from "react-native";
import { useAppSelector } from "@/store/hooks";

import HomeScreen from "./index";
import MessagesScreen from "./messages";
import MoreScreen from "./more";
import ParentPlatformScreen from "./parent-platform";
import ProgramsScreen from "./programs";
import ScheduleScreen from "./schedule";

const TAB_ROUTES: TabConfig[] = [
  { key: "programs", label: "Programs", icon: "activity" },
  { key: "messages", label: "Messages", icon: "message-square" },
  { key: "index", label: "Home", icon: "home" },
  { key: "parent-platform", label: "Parent", icon: "book" },
  { key: "schedule", label: "Schedule", icon: "calendar" },
];

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  "parent-platform": React.memo(ParentPlatformScreen),
  schedule: React.memo(ScheduleScreen),
};

export default function TabLayout() {
  const { role } = useRole();
  const { isAuthenticated, onboardingCompleted, hydrated, token, profile, athleteUserId } = useAppSelector(
    (state) => state.user
  );
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const pendingNavToken = useRef(0);
  const [messagesUnread, setMessagesUnread] = useState(0);

  const isOnboarding =
    segments.some((segment) => segment === "onboarding") ||
    pathname.includes("/onboarding");

  useEffect(() => {
    if (!isAuthenticated) return;
    if (onboardingCompleted === false && !isOnboarding) {
      router.replace("/(tabs)/onboarding");
    }
  }, [isAuthenticated, onboardingCompleted, isOnboarding, router]);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      setMessagesUnread(0);
      return;
    }

    let active = true;
    const effectiveUserId =
      role === "Athlete" && athleteUserId ? Number(athleteUserId) : Number(profile.id);
    const headers =
      role === "Athlete" && athleteUserId
        ? { "X-Acting-User-Id": String(athleteUserId) }
        : undefined;

    const syncUnread = async () => {
      try {
        const data = await apiRequest<{ messages: any[] }>("/messages", { token, headers });
        if (!active) return;
        const unread =
          data.messages?.filter(
            (message) => !message.read && Number(message.senderId) !== effectiveUserId
          ).length ?? 0;
        setMessagesUnread(unread);
      } catch {
        if (!active) return;
        setMessagesUnread(0);
      }
    };

    const task = InteractionManager.runAfterInteractions(() => {
      syncUnread();
    });
    const timer = setInterval(syncUnread, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      task?.cancel?.();
    };
  }, [athleteUserId, isAuthenticated, profile.id, role, token, pathname]);

  const visibleTabs = useMemo(() => {
    return TAB_ROUTES.map((tab) => {
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      if (tab.key === "parent-platform" && role === "Athlete") {
        return { ...tab, label: "Athlete" };
      }
      return tab;
    });
  }, [messagesUnread, role]);

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

  if (!hydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

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

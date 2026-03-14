import { SwipeableTabLayout, TabConfig } from "@/components/navigation";
import { useRole } from "@/context/RoleContext";
import { useSocket } from "@/context/SocketContext";
import { apiRequest, prefetchApi } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";
import { Redirect, Slot, usePathname, useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, Platform } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";

import HomeScreen from "./index";
import MessagesScreen from "./messages";
import MoreScreen from "./more";
import ProgramsScreen from "./programs";
import ScheduleScreen from "./schedule";

let lastTabKey = "index";

const TAB_ROUTES: TabConfig[] = [
  { key: "programs", label: "Programs", icon: "pulse", iconOutline: "pulse-outline" },
  {
    key: "messages",
    label: "Messages",
    icon: "chatbox-ellipses",
    iconOutline: "chatbox-ellipses-outline",
  },
  { key: "index", label: "Home", icon: "home", iconOutline: "home-outline" },
  { key: "schedule", label: "Schedule", icon: "calendar", iconOutline: "calendar-outline" },
  { key: "more", label: "More", icon: "menu", iconOutline: "menu-outline" },
];

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  schedule: React.memo(ScheduleScreen),
  more: React.memo(MoreScreen),
};

export default function TabLayout() {
  const { role } = useRole();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const onboardingCompleted = useAppSelector((state) => state.user.onboardingCompleted);
  const hydrated = useAppSelector((state) => state.user.hydrated);
  const token = useAppSelector((state) => state.user.token);
  const profile = useAppSelector((state) => state.user.profile);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const programTier = useAppSelector((state) => state.user.programTier);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { socket } = useSocket();
  const pendingNavToken = useRef(0);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const lastPrefetchAt = useRef(0);

  const isOnboarding =
    segments.some((segment) => segment === "onboarding") ||
    pathname.includes("/onboarding");

  useEffect(() => {
    if (!isAuthenticated) return;
    if (onboardingCompleted === false && !isOnboarding) {
      router.replace("/(tabs)/onboarding");
    }
  }, [isAuthenticated, onboardingCompleted, isOnboarding, router]);

  const syncUnread = useCallback(async () => {
    if (!token || !isAuthenticated || !canAccessTier(programTier ?? null, "PHP_Premium")) {
      setMessagesUnread(0);
      return;
    }

    const effectiveUserId =
      role === "Athlete" && athleteUserId ? Number(athleteUserId) : Number(profile.id);
    const headers =
      role === "Athlete" && athleteUserId
        ? { "X-Acting-User-Id": String(athleteUserId) }
        : undefined;

    try {
      const data = await apiRequest<{ messages: any[] }>("/messages", { token, headers });
      const unread =
        data.messages?.filter(
          (message) => !message.read && Number(message.senderId) !== effectiveUserId
        ).length ?? 0;
      setMessagesUnread(unread);
    } catch {
      setMessagesUnread(0);
    }
  }, [athleteUserId, isAuthenticated, profile.id, programTier, role, token]);

  useEffect(() => {
    if (!token || !isAuthenticated || !canAccessTier(programTier ?? null, "PHP_Premium")) {
      setMessagesUnread(0);
      return;
    }

    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (active) {
        syncUnread();
      }
    });
    const timer = setInterval(() => {
      if (active) {
        syncUnread();
      }
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      task?.cancel?.();
    };
  }, [isAuthenticated, programTier, syncUnread, token]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;
    const now = Date.now();
    if (now - lastPrefetchAt.current < 60_000) return;
    lastPrefetchAt.current = now;

    const headers =
      role === "Athlete" && athleteUserId
        ? { "X-Acting-User-Id": String(athleteUserId) }
        : undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      prefetchApi("/content/home", { token });
      prefetchApi("/bookings", { token });
      prefetchApi("/bookings/services", { token });
      prefetchApi("/public/plans");
      if (canAccessTier(programTier ?? null, "PHP_Premium")) {
        prefetchApi("/messages", { token, headers });
      }
    });

    return () => task?.cancel?.();
  }, [athleteUserId, isAuthenticated, programTier, role, token]);

  useEffect(() => {
    if (!socket || !token || !isAuthenticated || !canAccessTier(programTier ?? null, "PHP_Premium")) return;

    const effectiveUserId =
      role === "Athlete" && athleteUserId ? String(athleteUserId) : String(profile.id ?? "");
    const currentThreadFromPath = pathname.startsWith("/messages/")
      ? decodeURIComponent(pathname.replace("/messages/", "").split("/")[0] || "")
      : null;

    const handleDirectMessage = (payload: any) => {
      const senderId = String(payload?.senderId ?? "");
      const receiverId = String(payload?.receiverId ?? "");
      if (!senderId || !receiverId || senderId === effectiveUserId) return;
      const threadId = senderId === effectiveUserId ? receiverId : senderId;
      if (currentThreadFromPath && threadId === currentThreadFromPath) return;
      setMessagesUnread((prev) => prev + 1);
    };

    const handleGroupMessage = (payload: any) => {
      const senderId = String(payload?.senderId ?? "");
      const groupId = payload?.groupId;
      if (!groupId || senderId === effectiveUserId) return;
      const threadId = `group:${groupId}`;
      if (currentThreadFromPath && threadId === currentThreadFromPath) return;
      setMessagesUnread((prev) => prev + 1);
    };

    socket.on("message:new", handleDirectMessage);
    socket.on("group:message", handleGroupMessage);
    return () => {
      socket.off("message:new", handleDirectMessage);
      socket.off("group:message", handleGroupMessage);
    };
  }, [athleteUserId, isAuthenticated, pathname, profile.id, programTier, role, socket, token]);

  useEffect(() => {
    if (!pathname.startsWith("/messages")) return;
    syncUnread();
  }, [pathname, syncUnread]);

  useEffect(() => {
    getNotifications().then((Notifications) => {
      if (!Notifications || typeof Notifications.setBadgeCountAsync !== "function") return;
      Notifications.setBadgeCountAsync(Math.max(0, messagesUnread)).catch(() => null);
    });
  }, [messagesUnread]);

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
    if (!pathname.startsWith("/(tabs)")) {
      const storedIndex = visibleTabs.findIndex((tab) => tab.key === lastTabKey);
      return storedIndex >= 0 ? storedIndex : 0;
    }
    // Normalize path by removing leading slash and (tabs) group
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
    (index: number, source: "swipe" | "press" | "sync") => {
      const tab = visibleTabs[index];
      if (!tab) return;

      lastTabKey = tab.key;

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

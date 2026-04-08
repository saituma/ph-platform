import { SwipeableTabLayout, TabConfig } from "@/components/navigation";
import { useSocket } from "@/context/SocketContext";
import { apiRequest, prefetchApi } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";
import {
  Redirect,
  Slot,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InteractionManager, View } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { FirstLoginWalkthrough } from "@/components/onboarding/FirstLoginWalkthrough";
import { isAdminRole } from "@/lib/isAdminRole";
import { setGlobalTabRoutes } from "@/context/ActiveTabContext";

import HomeScreen from "./index";
import MessagesScreen from "./messages";
import MoreScreen from "./more";
import ProgramsScreen from "./programs";
import ScheduleScreen from "./schedule";
import TrackingHomeScreen from "./tracking/index";
import TrackingLayout from "./tracking/_layout";

import AdminHomeScreen from "./admin-home";
import AdminVideosScreen from "./admin-videos";
import AdminUsersScreen from "./admin-users";
import AdminContentScreen from "./admin-content";
import AdminOpsScreen from "./admin-ops";

let lastTabKey = "index";

const TEAM_MODE_TAB_ROUTES: TabConfig[] = [
  {
    key: "programs",
    label: "Programs",
    icon: "pulse",
    iconOutline: "pulse-outline",
  },
  {
    key: "messages",
    label: "Messages",
    icon: "chatbox-ellipses",
    iconOutline: "chatbox-ellipses-outline",
  },
  { key: "index", label: "Home", icon: "home", iconOutline: "home-outline" },
  {
    key: "schedule",
    label: "Schedule",
    icon: "calendar",
    iconOutline: "calendar-outline",
  },
  {
    key: "tracking",
    label: "Tracking",
    icon: "walk",
    iconOutline: "walk-outline",
  },
  { key: "more", label: "More", icon: "menu", iconOutline: "menu-outline" },
];

const ADMIN_TAB_ROUTES: TabConfig[] = [
  {
    key: "admin-home",
    label: "Admin",
    icon: "shield",
    iconOutline: "shield-outline",
  },
  {
    key: "admin-videos",
    label: "Videos",
    icon: "videocam",
    iconOutline: "videocam-outline",
  },
  {
    key: "admin-users",
    label: "Users",
    icon: "people",
    iconOutline: "people-outline",
  },
  {
    key: "admin-content",
    label: "Content",
    icon: "library",
    iconOutline: "library-outline",
  },
  {
    key: "admin-ops",
    label: "Ops",
    icon: "settings",
    iconOutline: "settings-outline",
  },
];

const DEFAULT_TAB_ROUTES: TabConfig[] = TEAM_MODE_TAB_ROUTES;

const TAB_COMPONENTS: Record<string, React.ComponentType<any>> = {
  index: React.memo(HomeScreen),
  programs: React.memo(ProgramsScreen),
  messages: React.memo(MessagesScreen),
  schedule: React.memo(ScheduleScreen),
  tracking: React.memo(function TrackingTabScreen() {
    const pathname = usePathname();
    const isTrackingRoute =
      pathname.startsWith("/(tabs)/tracking") ||
      pathname.startsWith("/tracking");

    // When users swipe/press to the Tracking tab, we intentionally do not
    // change the Expo Router route (perf). In that case, rendering the
    // tracking Stack layout would incorrectly mirror the current route
    // (often Home). Instead, show the Tracking home screen unless we are
    // actually on a tracking route (e.g. active-run/summary).
    return isTrackingRoute ? <TrackingLayout /> : <TrackingHomeScreen />;
  }),
  more: React.memo(MoreScreen),
  "admin-home": React.memo(AdminHomeScreen),
  "admin-videos": React.memo(AdminVideosScreen),
  "admin-users": React.memo(AdminUsersScreen),
  "admin-content": React.memo(AdminContentScreen),
  "admin-ops": React.memo(AdminOpsScreen),
};

export default function TabLayout() {
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  const effectiveAuth = forceLogout ? false : isAuthenticated;
  const onboardingCompleted = useAppSelector(
    (state) => state.user.onboardingCompleted,
  );
  const hydrated = useAppSelector((state) => state.user.hydrated);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const token = useAppSelector((state) => state.user.token);
  const profile = useAppSelector((state) => state.user.profile);
  const appRole = useAppSelector((state) => state.user.appRole);
  const apiUserRole = useAppSelector((state) => state.user.apiUserRole);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const programTier = useAppSelector((state) => state.user.programTier);
  const messagingAccessTiers = useAppSelector(
    (state) => state.user.messagingAccessTiers,
  );
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { socket } = useSocket();

  const isAdmin = isAdminRole(apiUserRole);

  const lastHandledNotificationRef = useRef<string | null>(null);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const lastPrefetchAt = useRef(0);

  const isOnboarding =
    segments.some((segment) => segment === "onboarding") ||
    pathname.includes("/onboarding");

  useEffect(() => {
    if (!effectiveAuth) return;
    if (onboardingCompleted === false && !isOnboarding) {
      router.replace("/(tabs)/onboarding");
    }
  }, [effectiveAuth, onboardingCompleted, isOnboarding, router]);

  useEffect(() => {
    if (!hydrated || !bootstrapReady || !effectiveAuth) return;
    let sub: { remove: () => void } | null = null;

    const handleNotificationResponse = (response: any) => {
      const identifier = response?.notification?.request?.identifier;
      if (identifier && identifier === lastHandledNotificationRef.current)
        return;
      if (identifier) lastHandledNotificationRef.current = identifier;

      const data = response?.notification?.request?.content?.data as
        | {
            threadId?: string;
            type?: string;
            screen?: string;
            url?: string;
            contentId?: string | number;
            videoUploadId?: string | number;
          }
        | undefined;

      if (data?.url) {
        router.push(data.url as any);
        return;
      }
      const threadId = data?.threadId;
      if (threadId) {
        router.push(`/messages/${String(threadId)}`);
        return;
      }
      if (data?.type === "booking" || data?.screen === "schedule") {
        router.push("/(tabs)/schedule");
        return;
      }
      if (data?.screen === "messages") {
        router.push("/(tabs)/messages");
        return;
      }
      if (data?.screen === "plans" || data?.type === "plan_approved") {
        router.push("/plans");
        return;
      }
      if (
        data?.screen === "physio-referral" ||
        data?.type === "physio-referral"
      ) {
        router.push("/physio-referral");
        return;
      }
      if (
        data?.type === "video_reviewed" &&
        (data?.contentId != null || data?.videoUploadId != null)
      ) {
        if (data.contentId != null) {
          router.push(`/programs/content/${String(data.contentId)}`);
        } else {
          router.push("/video-upload");
        }
        return;
      }
    };

    getNotifications().then(async (Notifications) => {
      if (!Notifications) return;
      if (
        typeof Notifications.addNotificationResponseReceivedListener ===
        "function"
      ) {
        sub = Notifications.addNotificationResponseReceivedListener(
          handleNotificationResponse,
        );
      }
      if (
        typeof Notifications.getLastNotificationResponseAsync === "function"
      ) {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          handleNotificationResponse(response);
          if (
            typeof Notifications.clearLastNotificationResponseAsync ===
            "function"
          ) {
            await Notifications.clearLastNotificationResponseAsync();
          }
        }
      }
    });

    return () => {
      sub?.remove();
    };
  }, [bootstrapReady, hydrated, effectiveAuth, router]);

  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);

  const syncUnread = useCallback(async () => {
    if (!token || !effectiveAuth || !bootstrapReady || !hasMessaging) {
      setMessagesUnread(0);
      return;
    }

    const effectiveUserId = Number(profile.id);

    try {
      const data = await apiRequest<{ messages: any[] }>("/messages", {
        token,
      });
      const unread =
        data.messages?.filter(
          (message) =>
            !message.read && Number(message.senderId) !== effectiveUserId,
        ).length ?? 0;
      setMessagesUnread(unread);
    } catch {
      setMessagesUnread(0);
    }
  }, [bootstrapReady, effectiveAuth, hasMessaging, profile.id, token]);

  useEffect(() => {
    if (!token || !effectiveAuth || !bootstrapReady || !hasMessaging) {
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
  }, [bootstrapReady, effectiveAuth, hasMessaging, syncUnread, token]);

  useEffect(() => {
    if (!token || !effectiveAuth || !bootstrapReady) return;
    const now = Date.now();
    if (now - lastPrefetchAt.current < 60_000) return;
    lastPrefetchAt.current = now;

    const task = InteractionManager.runAfterInteractions(() => {
      prefetchApi("/content/home", { token });
      prefetchApi("/bookings", { token });
      prefetchApi("/bookings/services", { token });
      prefetchApi("/public/plans");
      if (hasMessaging) {
        prefetchApi("/messages", { token });
      }
    });

    return () => task?.cancel?.();
  }, [bootstrapReady, effectiveAuth, programTier, token]);

  useEffect(() => {
    if (!socket || !token || !effectiveAuth || !bootstrapReady || !hasMessaging)
      return;

    const actingId = athleteUserId ? Number(athleteUserId) : NaN;
    const effectiveUserId = String(
      Number.isFinite(actingId) && actingId > 0 ? actingId : (profile.id ?? ""),
    );
    const currentThreadFromPath = pathname.startsWith("/messages/")
      ? decodeURIComponent(
          pathname.replace("/messages/", "").split("/")[0] || "",
        )
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
  }, [
    bootstrapReady,
    effectiveAuth,
    pathname,
    profile.id,
    programTier,
    socket,
    token,
  ]);

  useEffect(() => {
    if (!pathname.startsWith("/messages")) return;
    syncUnread();
  }, [pathname, syncUnread]);

  useEffect(() => {
    getNotifications().then((Notifications) => {
      if (
        !Notifications ||
        typeof Notifications.setBadgeCountAsync !== "function"
      )
        return;
      Notifications.setBadgeCountAsync(Math.max(0, messagesUnread)).catch(
        () => null,
      );
    });
  }, [messagesUnread]);

  const baseTabs = useMemo(() => {
    if (isAdmin) {
      return ADMIN_TAB_ROUTES;
    }
    const roleTabs =
      appRole === "youth_athlete_team_guardian"
        ? TEAM_MODE_TAB_ROUTES
        : DEFAULT_TAB_ROUTES;
    const isYouthRole =
      typeof appRole === "string" && appRole.startsWith("youth_");
    if (isYouthRole) {
      return roleTabs.filter((tab) => tab.key !== "tracking");
    }
    return roleTabs;
  }, [appRole, isAdmin]);

  const visibleTabs = useMemo(() => {
    return baseTabs.map((tab) => {
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      return tab;
    });
  }, [baseTabs, messagesUnread]);

  useEffect(() => {
    setGlobalTabRoutes(visibleTabs.map((tab) => tab.key));
  }, [visibleTabs]);

  const initialIndex = useMemo(() => {
    if (!pathname.startsWith("/(tabs)")) {
      const storedIndex = visibleTabs.findIndex(
        (tab) => tab.key === lastTabKey,
      );
      return storedIndex >= 0 ? storedIndex : 0;
    }
    // Normalize path by removing leading slash and (tabs) group
    const normalizedPath = pathname
      .replace(/^\//, "")
      .replace(/^\(tabs\)\/?/, "");
    const isProgramsPath =
      pathname.replace(/\/+$/, "") === "/(tabs)/programs" ||
      pathname.replace(/\/+$/, "") === "/programs";
    const routeName = normalizedPath.split("/")[0] || "index";

    const index = visibleTabs.findIndex((tab) => tab.key === routeName);
    const resolvedIndex = index >= 0 ? index : 0;
    lastTabKey = visibleTabs[resolvedIndex]?.key ?? "index";
    return resolvedIndex;
  }, [pathname, visibleTabs]);

  // PERF: Do NOT call router.replace() here. PagerView already manages the
  // visible page natively. Calling router.replace on every tab switch was
  // the primary source of lag — it tears down and rebuilds the entire
  // screen tree through Expo Router's navigation cycle.
  // We only track the last active tab key for deep-link restoration.
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
      const Component = TAB_COMPONENTS[tab.key];
      // Return component directly to avoid double wrapping with PagerView's container
      return <Component key={tab.key} />;
    });
  }, [visibleTabs]); // visibleTabs only changes when role changes

  const containerStyle = [
    {
      flex: 1,
      backgroundColor: "transparent",
    },
  ];

  if (!hydrated || (effectiveAuth && !bootstrapReady)) {
    return null;
  }

  if (!effectiveAuth) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isOnboarding) {
    return (
      <View style={containerStyle}>
        <Slot />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <SwipeableTabLayout
        tabs={visibleTabs}
        initialIndex={initialIndex}
        onIndexChange={handleIndexChange}
      >
        {screens}
      </SwipeableTabLayout>
      <FirstLoginWalkthrough />
    </View>
  );
}

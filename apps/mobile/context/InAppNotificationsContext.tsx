import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { getNotifications } from "@/lib/notifications";
import { setupNotificationChannels } from "@/lib/notificationSetup";
import {
  formatRelativeTime,
  getNotificationMeta,
  getNotificationTitle,
  inferNotificationCategory,
} from "@/lib/notificationPresentation";

export type InAppNotificationPayload = {
  title?: string;
  message: string;
  timestamp?: number;
  type?: string;
  groupKey?: string;
  onPress?: () => void;
};

type InAppNotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type?: string;
  groupKey: string;
  count: number;
  updatedAt: number;
  onPress?: () => void;
};

type InAppNotificationsContextValue = {
  notify: (payload: InAppNotificationPayload) => void;
  dismiss: (id: string) => void;
  isForeground: boolean;
};

const InAppNotificationsContext = createContext<InAppNotificationsContextValue>(
  {
    notify: () => {},
    dismiss: () => {},
    isForeground: true,
  },
);

const AUTO_DISMISS_MS = 5200;
const GROUP_WINDOW_MS = 3 * 60 * 1000;
const MAX_VISIBLE = 3;

export function InAppNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [items, setItems] = useState<InAppNotificationItem[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );
  const timersRef = useRef(
    new Map<string, { timeout: NodeJS.Timeout; updatedAt: number }>(),
  );
  const handlerConfiguredRef = useRef(false);

  const isSafeInternalPath = (value: unknown): value is string => {
    if (typeof value !== "string") return false;
    const url = value.trim();
    if (!url.startsWith("/")) return false;
    if (url.startsWith("//")) return false;
    if (url.includes("://")) return false;
    if (url.includes("..")) return false;
    return true;
  };

  const isForeground = appState === "active";

  useEffect(() => {
    const sub = AppState.addEventListener("change", setAppState);
    return () => sub.remove();
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer.timeout);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (payload: InAppNotificationPayload) => {
      if (!isForeground) return;
      const now = payload.timestamp ?? Date.now();
      const groupKey =
        payload.groupKey ?? payload.type ?? payload.title ?? "general";

      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            item.groupKey === groupKey &&
            now - item.updatedAt < GROUP_WINDOW_MS,
        );
        if (existingIndex >= 0) {
          const next = [...prev];
          const existing = next[existingIndex];
          next[existingIndex] = {
            ...existing,
            title: payload.title ?? existing.title,
            message: payload.message,
            type: payload.type ?? existing.type,
            count: existing.count + 1,
            updatedAt: now,
            timestamp: now,
            onPress: payload.onPress ?? existing.onPress,
          };
          return next;
        }
        const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
        const title = payload.title ?? "Notification";
        const next = [
          {
            id,
            title,
            message: payload.message,
            timestamp: now,
            updatedAt: now,
            type: payload.type,
            groupKey,
            count: 1,
            onPress: payload.onPress,
          },
          ...prev,
        ];
        return next.slice(0, MAX_VISIBLE);
      });

      if (Platform.OS !== "web") {
        import("expo-haptics")
          .then((Haptics) => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          })
          .catch(() => {});
      }
    },
    [isForeground],
  );

  // Keep a stable ref so the notification listener effect doesn't re-subscribe
  // every time the app toggles between foreground and background.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    items.forEach((item) => {
      const existingTimer = timersRef.current.get(item.id);
      if (existingTimer && existingTimer.updatedAt === item.updatedAt) return;
      if (existingTimer) {
        clearTimeout(existingTimer.timeout);
      }
      const timeout = setTimeout(
        () => dismiss(item.id),
        AUTO_DISMISS_MS + (item.count - 1) * 600,
      );
      timersRef.current.set(item.id, { timeout, updatedAt: item.updatedAt });
    });

    for (const [id, timer] of timersRef.current.entries()) {
      if (!items.find((item) => item.id === id)) {
        clearTimeout(timer.timeout);
        timersRef.current.delete(id);
      }
    }
  }, [dismiss, items]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    setupNotificationChannels();
    getNotifications().then((Notifications) => {
      if (!Notifications) return;
      if (
        !handlerConfiguredRef.current &&
        typeof Notifications.setNotificationHandler === "function"
      ) {
        handlerConfiguredRef.current = true;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            // Let the OS present remote notifications while the app is foregrounded
            // so they behave like real push notifications instead of in-app only toasts.
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      }

      if (typeof Notifications.addNotificationReceivedListener === "function") {
        sub = Notifications.addNotificationReceivedListener(
          (notification: any) => {
            const content = notification?.request?.content;
            if (!content) return;
            const data = (content.data ?? {}) as Record<string, any>;
            if (data?.suppressInApp) return;
            const category = inferNotificationCategory(
              data?.type,
              content?.body,
            );
            const meta = getNotificationMeta(category);
            const url = isSafeInternalPath(data?.url)
              ? data.url.trim()
              : undefined;
            notifyRef.current({
              title: content?.title ?? meta.label,
              message: content?.body ?? "",
              type: data?.type ?? category,
              groupKey: data?.threadId
                ? `thread:${data.threadId}`
                : data?.groupId
                  ? `group:${data.groupId}`
                  : data?.type
                    ? `type:${data.type}`
                    : (content?.title ?? "general"),
              onPress: url ? () => router.push(url as any) : undefined,
            });
          },
        );
      }
    });

    return () => {
      sub?.remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      notify,
      dismiss,
      isForeground,
    }),
    [dismiss, isForeground, notify],
  );

  return (
    <InAppNotificationsContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 50,
        }}
      >
        {items.map((item, index) => {
          const category = inferNotificationCategory(item.type, item.message);
          const meta = getNotificationMeta(category);
          const title = getNotificationTitle(item.type, category) || meta.label;

          const accent =
            category === "schedule"
              ? colors.warning
              : category === "payment"
                ? colors.danger
                : category === "account"
                  ? colors.tint
                  : category === "progress"
                    ? colors.success
                    : category === "system"
                      ? colors.warning
                      : colors.accent;
          const accentSoft =
            category === "payment"
              ? colors.dangerSoft
              : category === "schedule"
                ? colors.warningSoft
                : category === "progress"
                  ? colors.successSoft
                  : colors.accentLight;

          return (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(index * 40).duration(240)}
              exiting={FadeOutUp.duration(180)}
              layout={Layout.springify()}
              style={{ marginBottom: 10 }}
            >
              <Pressable
                onPress={() => {
                  item.onPress?.();
                  dismiss(item.id);
                }}
                onLongPress={() => dismiss(item.id)}
                accessibilityRole="alert"
                accessibilityLabel={`${title}. ${item.message}`}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    shadowColor: "#000",
                    shadowOpacity: isDark ? 0.35 : 0.14,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: isDark ? 10 : 6,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{ flexDirection: "row", alignItems: "flex-start" }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Ionicons name={meta.icon} size={22} color={accent} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        <Text
                          className="text-sm font-outfit-semibold text-app"
                          numberOfLines={1}
                        >
                          {title}
                        </Text>
                        {item.count > 1 ? (
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 999,
                              backgroundColor: accentSoft,
                            }}
                          >
                            <Text className="text-xs font-outfit-semibold text-app">
                              {item.count} new
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        className="text-[13px] font-outfit text-secondary"
                        numberOfLines={2}
                        style={{ marginTop: 4, lineHeight: 18 }}
                      >
                        {item.message}
                      </Text>
                      {item.onPress ? (
                        <Text
                          className="text-[11px] font-outfit text-accent"
                          style={{ marginTop: 6 }}
                          numberOfLines={1}
                        >
                          Tap to open
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      className="text-[11px] font-outfit text-secondary"
                      style={{ marginLeft: 8 }}
                    >
                      {formatRelativeTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </InAppNotificationsContext.Provider>
  );
}

export function useInAppNotifications() {
  return useContext(InAppNotificationsContext);
}

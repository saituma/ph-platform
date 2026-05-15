import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { SkeletonNotificationsScreen } from "@/components/ui/legacy-skeleton";
import {
  formatRelativeTime,
  formatSectionHeading,
  getDateKey,
  getNotificationMeta,
  getNotificationTitle,
  inferNotificationCategory,
} from "@/lib/notificationPresentation";
import {
  Bell,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

const GROUP_WINDOW_MS = 2 * 60 * 60 * 1000;

type NotificationItem = {
  id: number;
  type?: string | null;
  content?: string | null;
  link?: string | null;
  read?: boolean;
  createdAt?: string | null;
};

type NotificationGroup = {
  id: string;
  items: NotificationItem[];
  category: ReturnType<typeof inferNotificationCategory>;
  title: string;
  message: string;
  count: number;
  unreadCount: number;
  latestAt: Date;
  link?: string | null;
};

type NotificationSection = {
  key: string;
  title: string;
  groups: NotificationGroup[];
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
  message: MessageSquare,
  schedule: Calendar,
  progress: TrendingUp,
  account: Info,
  system: AlertTriangle,
  announcement: Megaphone,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const { token } = useAppSelector((state) => state.user);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoadingNotifications(true);
    try {
      const data = await apiRequest<{ items: NotificationItem[] }>("/notifications", {
        token,
        suppressLog: true,
      });
      setNotifications(data.items ?? []);
    } catch {
      // ignore errors to keep screen usable
    } finally {
      setLoadingNotifications(false);
    }
  }, [token]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require("expo-notifications");
      Notifications.getPermissionsAsync()
        .then(({ status }: { status: string }) => setPushGranted(status === "granted"))
        .catch(() => setPushGranted(false));
    } catch {
      // expo-notifications unavailable in Expo Go — leave null, hide the card
    }
  }, []);

  const markRead = async (id: number) => {
    if (!token) return;
    try {
      await apiRequest("/notifications/read", {
        method: "POST",
        token,
        body: { notificationId: id },
        suppressLog: true,
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  const sections = useMemo<NotificationSection[]>(() => {
    const now = new Date();
    const sorted = [...notifications].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const sectionsMap = new Map<string, NotificationSection>();

    sorted.forEach((item) => {
      const createdAt = item.createdAt ? new Date(item.createdAt) : now;
      const dayKey = getDateKey(createdAt);
      let section = sectionsMap.get(dayKey);
      if (!section) {
        section = {
          key: dayKey,
          title: formatSectionHeading(createdAt, now),
          groups: [],
        };
        sectionsMap.set(dayKey, section);
      }

      const category = inferNotificationCategory(item.type, item.content);
      const meta = getNotificationMeta(category);
      const title = getNotificationTitle(item.type, category) ?? meta.label;
      const message = item.content ?? "Notification";
      const groupKey = `${category}:${item.link ?? ""}`;
      const lastGroup = section.groups[section.groups.length - 1];

      if (
        lastGroup &&
        lastGroup.id === groupKey &&
        Math.abs(createdAt.getTime() - lastGroup.latestAt.getTime()) < GROUP_WINDOW_MS
      ) {
        lastGroup.items.push(item);
        lastGroup.count += 1;
        if (!item.read) lastGroup.unreadCount += 1;
        return;
      }

      section.groups.push({
        id: groupKey,
        items: [item],
        category,
        title,
        message,
        count: 1,
        unreadCount: item.read ? 0 : 1,
        latestAt: createdAt,
        link: item.link,
      });
    });

    return Array.from(sectionsMap.values());
  }, [notifications]);

  const unreadTotal = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <MoreStackHeader
        title="Notifications"
        subtitle="Stay in the loop with messages, schedule changes, and account updates."
        badge="Alerts"
      />

      <ThemedScrollView
        onRefresh={async () => {
          await loadNotifications();
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ height: 24, width: 6, borderRadius: 99, backgroundColor: p.accent }} />
              <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary }}>Recent Activity</Text>
            </View>
            {unreadTotal > 0 ? (
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, backgroundColor: p.accentSoft }}>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.accent }}>
                  {unreadTotal} unread
                </Text>
              </View>
            ) : null}
          </View>

          {loadingNotifications ? (
            <SkeletonNotificationsScreen />
          ) : notifications.length === 0 ? (
            <View style={{ backgroundColor: p.inputBg, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: p.divider }}>
              <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                No notifications yet.
              </Text>
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 8 }}>
                We will surface important updates here the moment they happen.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 24 }}>
              {sections.map((section) => (
                <View key={section.key} style={{ gap: 12 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.textSecondary, textTransform: "uppercase", letterSpacing: 1.5 }}>
                    {section.title}
                  </Text>
                  {section.groups.map((group, index) => {
                    const accent =
                      group.category === "schedule"
                        ? p.warning
                        : group.category === "account"
                        ? p.info
                        : group.category === "progress"
                        ? p.success
                        : group.category === "system"
                        ? p.warning
                        : p.accent;
                    const accentSoft =
                      group.category === "schedule"
                        ? p.warningSoft
                        : group.category === "progress"
                        ? p.successSoft
                        : p.accentSoft;

                    const IconComp = CATEGORY_ICON[group.category] || Bell;

                    return (
                      <Animated.View
                        key={`${group.id}-${index}`}
                        entering={FadeInDown.delay(index * 35).duration(200)}
                      >
                        <Pressable
                          onPress={() => {
                            group.items.forEach((item) => {
                              if (!item.read) {
                                markRead(item.id);
                              }
                            });
                            if (group.link) {
                              router.navigate(group.link as any);
                            }
                          }}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.9 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          })}
                          accessibilityRole="button"
                          accessibilityLabel={`${group.title}. ${group.message}`}
                        >
                          <View
                            style={{
                              backgroundColor: p.cardWhite,
                              borderRadius: 22,
                              padding: 16,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                                <IconComp size={20} color={accent} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                  <Text style={{ fontSize: 15, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                                    {group.title}
                                  </Text>
                                  {group.count > 1 ? (
                                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, backgroundColor: p.accentSoft }}>
                                      <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.accent }}>
                                        {group.count}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text
                                  numberOfLines={2}
                                  style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}
                                >
                                  {group.message}
                                </Text>
                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                                  {group.unreadCount > 0 ? (
                                    <View
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 999,
                                        backgroundColor: accent,
                                        marginRight: 6,
                                      }}
                                    />
                                  ) : null}
                                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted }}>
                                    {formatRelativeTime(group.latestAt)}
                                  </Text>
                                  {group.unreadCount > 0 ? (
                                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginLeft: 6 }}>
                                      · {group.unreadCount} unread
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {pushGranted !== null ? (
          <>
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <View style={{ height: 24, width: 6, borderRadius: 99, backgroundColor: p.accent }} />
                <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary }}>Push Notifications</Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: p.cardWhite,
                borderRadius: 24,
                padding: 20,
                marginBottom: 32,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              <View
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pushGranted ? p.successSoft : p.inputBg,
                }}
              >
                {pushGranted
                  ? <CheckCircle size={24} color={p.success} />
                  : <XCircle size={24} color={p.textMuted} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                  {pushGranted ? "Notifications enabled" : "Notifications disabled"}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 2, lineHeight: 18 }}>
                  {pushGranted
                    ? "You'll receive alerts for messages, schedule changes, and updates."
                    : "Enable notifications in Settings to receive alerts."}
                </Text>
                <Pressable
                  onPress={() => void Linking.openURL("app-settings:")}
                  accessibilityRole="button"
                  accessibilityLabel="Open notification settings"
                  style={{ marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, backgroundColor: p.accentSoft }}
                >
                  <Text style={{ fontSize: 13, fontFamily: "Outfit-SemiBold", color: p.accent }}>
                    Manage in Settings
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

      </ThemedScrollView>
    </SafeAreaView>
  );
}


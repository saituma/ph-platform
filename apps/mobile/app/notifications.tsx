import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";
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
  Mail,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  Info,
  Check,
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

const TOGGLE_ICON: Record<string, LucideIcon> = {
  notifications: Bell,
  mail: Mail,
  "chatbubble-ellipses": MessageSquare,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const { token } = useAppSelector((state) => state.user);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);
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
            <View style={{ backgroundColor: p.cardWhite, borderRadius: 24, padding: 24 }}>
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

        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View style={{ height: 24, width: 6, borderRadius: 99, backgroundColor: p.accent }} />
            <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary }}>Alert Preferences</Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 22 }}>
            Choose the channels and cadence that feel right for you.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: p.cardWhite,
            borderRadius: 24,
            overflow: "hidden",
            marginBottom: 32,
          }}
        >
          <NotificationToggle
            label="Push Notifications"
            description="Receive alerts on your device for new messages and events."
            value={pushEnabled}
            onToggle={setPushEnabled}
            iconKey="notifications"
          />
          <NotificationToggle
            label="Email Updates"
            description="Get weekly digests and important account alerts via email."
            value={emailEnabled}
            onToggle={setEmailEnabled}
            iconKey="mail"
          />
          <NotificationToggle
            label="SMS Alerts"
            description="Receive urgent schedule changes via text message."
            value={smsEnabled}
            onToggle={setSmsEnabled}
            iconKey="chatbubble-ellipses"
            isLast
          />
        </View>

        <Pressable
          onPress={() => router.navigate("/(tabs)/more")}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: 100,
            backgroundColor: p.accent,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Check size={20} color={p.buttonPrimaryText} />
          <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 16 }}>
            Save Preferences
          </Text>
        </Pressable>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function NotificationToggle({
  label,
  description,
  value,
  onToggle,
  iconKey,
  isLast = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  iconKey: string;
  isLast?: boolean;
}) {
  const p = useAdminPastel();
  const IconComp = TOGGLE_ICON[iconKey] || Bell;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 20, borderBottomWidth: isLast ? 0 : 1, borderColor: p.divider }}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 }}>
          <View style={{ height: 24, width: 24, borderRadius: 8, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <IconComp size={14} color={p.accent} />
          </View>
          <Text style={{ fontSize: 17, fontFamily: "Outfit-Bold", color: p.textPrimary }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 20 }}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: p.divider, true: p.accent }}
        thumbColor={p.cardWhite}
      />
    </View>
  );
}

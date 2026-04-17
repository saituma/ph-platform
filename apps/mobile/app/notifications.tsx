import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import {
  formatRelativeTime,
  formatSectionHeading,
  getDateKey,
  getNotificationMeta,
  getNotificationTitle,
  inferNotificationCategory,
} from "@/lib/notificationPresentation";

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

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();
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
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
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
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="h-6 w-1.5 rounded-full bg-accent" />
              <Text className="text-3xl font-clash text-app">Recent Activity</Text>
            </View>
            {unreadTotal > 0 ? (
              <View className="px-3 py-1 rounded-full bg-accent/10 border border-accent/30">
                <Text className="text-xs font-outfit-semibold text-app">
                  {unreadTotal} unread
                </Text>
              </View>
            ) : null}
          </View>

          {loadingNotifications ? (
            <Text className="text-base font-outfit text-secondary">Loading notifications...</Text>
          ) : notifications.length === 0 ? (
            <View className="bg-card rounded-3xl border border-border p-6">
              <Text className="text-base font-outfit text-secondary">
                No notifications yet.
              </Text>
              <Text className="text-sm font-outfit text-secondary mt-2">
                We will surface important updates here the moment they happen.
              </Text>
            </View>
          ) : (
            <View className="gap-6">
              {sections.map((section) => (
                <View key={section.key} className="gap-3">
                  <Text className="text-xs font-outfit-semibold text-secondary uppercase tracking-widest">
                    {section.title}
                  </Text>
                  {section.groups.map((group, index) => {
                    const meta = getNotificationMeta(group.category);
                    const accent =
                      group.category === "schedule"
                        ? colors.warning
                        : group.category === "account"
                        ? colors.tint
                        : group.category === "progress"
                        ? colors.success
                        : group.category === "system"
                        ? colors.warning
                        : colors.accent;
                    const accentSoft =
                      group.category === "schedule"
                        ? colors.warningSoft
                        : group.category === "progress"
                        ? colors.successSoft
                        : colors.accentLight;

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
                              backgroundColor: colors.card,
                              borderRadius: 22,
                              borderWidth: 1,
                              borderColor: group.unreadCount > 0 ? accent : colors.border,
                              padding: 16,
                              shadowColor: "#000",
                              shadowOpacity: isDark ? 0.25 : 0.08,
                              shadowRadius: 14,
                              shadowOffset: { width: 0, height: 6 },
                              elevation: isDark ? 6 : 4,
                            }}
                          >
                            <View className="flex-row items-center">
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
                                <Ionicons name={meta.icon} size={20} color={accent} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View className="flex-row items-center gap-2">
                                  <Text className="text-base font-outfit-semibold text-app">
                                    {group.title}
                                  </Text>
                                  {group.count > 1 ? (
                                    <View className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30">
                                      <Text className="text-[11px] font-outfit-semibold text-app">
                                        {group.count}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text
                                  className="text-sm font-outfit text-secondary"
                                  numberOfLines={2}
                                  style={{ marginTop: 4 }}
                                >
                                  {group.message}
                                </Text>
                                <View className="flex-row items-center mt-3">
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
                                  <Text className="text-xs font-outfit text-secondary">
                                    {formatRelativeTime(group.latestAt)}
                                  </Text>
                                  {group.unreadCount > 0 ? (
                                    <Text className="text-xs font-outfit text-secondary" style={{ marginLeft: 6 }}>
                                      • {group.unreadCount} unread
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

        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-clash text-app">Alert Preferences</Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Choose the channels and cadence that feel right for you.
          </Text>
        </View>

        <View
          className="bg-input rounded-3xl overflow-hidden border border-app shadow-sm mb-8"
          style={
            isDark
              ? undefined
              : {
                  shadowColor: "#0F172A",
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }
          }
        >
          <NotificationToggle
            label="Push Notifications"
            description="Receive alerts on your device for new messages and events."
            value={pushEnabled}
            onToggle={setPushEnabled}
            icon="notifications"
          />
          <NotificationToggle
            label="Email Updates"
            description="Get weekly digests and important account alerts via email."
            value={emailEnabled}
            onToggle={setEmailEnabled}
            icon="mail"
          />
          <NotificationToggle
            label="SMS Alerts"
            description="Receive urgent schedule changes via text message."
            value={smsEnabled}
            onToggle={setSmsEnabled}
            icon="chatbubble-ellipses"
            isLast
          />
        </View>

        <ActionButton
          label="Save Preferences"
          onPress={() => router.navigate("/(tabs)/more")}
          color="bg-accent"
          icon="check"
          fullWidth={true}
        />
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function NotificationToggle({
  label,
  description,
  value,
  onToggle,
  icon,
  isLast = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  icon: keyof typeof Ionicons.glyphMap;
  isLast?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View className={`flex-row items-center p-5 ${!isLast ? "border-b border-app" : ""}`}>
      <View className="flex-1 mr-4">
        <View className="flex-row items-center mb-1 gap-2">
          <View className="h-6 w-6 rounded-lg bg-secondary items-center justify-center">
            <Ionicons name={icon} size={14} color={colors.accent} />
          </View>
          <Text className="text-lg font-bold font-clash text-app">{label}</Text>
        </View>
        <Text className="text-sm font-outfit text-secondary leading-relaxed">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.background}
      />
    </View>
  );
}

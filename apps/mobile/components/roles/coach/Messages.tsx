import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderTabKey } from "@/types/admin-messages";
import { Chip } from "@/components/admin/AdminShared";
import { AdminDmSection } from "@/components/admin/messages/AdminDmSection";
import { AdminGroupSection } from "@/components/admin/messages/AdminGroupSection";
import { AdminStatsSection } from "@/components/admin/messages/AdminStatsSection";
import { useAdminDms } from "@/hooks/admin/useAdminDms";
import { useAdminGroups } from "@/hooks/admin/useAdminGroups";
import { safeNumber } from "@/lib/admin-messages-utils";

export default function AdminMessagesScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const myUserIdRaw = useAppSelector((state) => state.user.profile?.id) ?? null;
  const myUserId = useMemo(() => {
    if (myUserIdRaw == null) return null;
    const n = Number(myUserIdRaw);
    return Number.isFinite(n) ? n : null;
  }, [myUserIdRaw]);

  const [activeTab, setActiveTab] = useState<HeaderTabKey>("inbox");

  const canLoad = Boolean(token && bootstrapReady);
  const dms = useAdminDms(token, canLoad);
  const groups = useAdminGroups(token, canLoad);

  const dmUnreadTotal = useMemo(() => {
    return dms.threads.reduce((sum, t) => sum + safeNumber(t.unread, 0), 0);
  }, [dms.threads]);

  const groupUnreadTotal = useMemo(() => {
    return groups.groups.reduce(
      (sum, g) => sum + safeNumber(g.unreadCount, 0),
      0,
    );
  }, [groups.groups]);

  const stats = useMemo(
    () => ({
      directThreads: dms.threads.length,
      directUnread: dmUnreadTotal,
      groups: groups.groups.length,
      groupUnread: groupUnreadTotal,
      announcementGroups: groups.groups.filter(
        (g) => (g.category ?? "").toLowerCase() === "announcement",
      ).length,
      teamGroups: groups.groups.filter((g) =>
        ["team", "coach_group"].includes((g.category ?? "").toLowerCase()),
      ).length,
    }),
    [dms.threads.length, dmUnreadTotal, groups.groups, groupUnreadTotal],
  );

  const headerTabs: { key: HeaderTabKey; label: string }[] = [
    { key: "inbox", label: "Inbox" },
    { key: "announcement", label: "Announcements" },
    { key: "teams", label: "Teams" },
    { key: "stats", label: "Stats" },
  ];

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView>
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text className="text-4xl font-telma-bold text-app tracking-tight">
                Messages
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">
                Admin Controls
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2 mb-4">
          {headerTabs.map((tab) => (
            <Chip
              key={tab.key}
              label={tab.label}
              selected={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {!canLoad ? (
            <Text className="text-sm font-outfit text-secondary">
              Tools will load after auth bootstrap.
            </Text>
          ) : (
            <>
              {activeTab === "inbox" && (
                <AdminDmSection
                  token={token}
                  canLoad={canLoad}
                  myUserId={myUserId}
                />
              )}
              {activeTab === "announcement" && (
                <AdminGroupSection
                  token={token}
                  canLoad={canLoad}
                  myUserId={myUserId}
                  category="announcement"
                />
              )}
              {activeTab === "teams" && (
                <AdminGroupSection
                  token={token}
                  canLoad={canLoad}
                  myUserId={myUserId}
                  category="team"
                />
              )}
              {activeTab === "stats" && <AdminStatsSection stats={stats} />}
            </>
          )}
        </View>
      </ThemedScrollView>
    </View>
  );
}

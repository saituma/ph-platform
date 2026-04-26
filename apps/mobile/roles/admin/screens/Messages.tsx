import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { useAppSelector } from "@/store/hooks";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@/components/ui/theme-icons";

import { HeaderTabKey } from "@/types/admin-messages";
import { AdminDmSection } from "@/components/admin/messages/AdminDmSection";
import { AdminStatsSection } from "@/components/admin/messages/AdminStatsSection";
import { useAdminDms } from "@/hooks/admin/useAdminDms";
import { useAdminGroups } from "@/hooks/admin/useAdminGroups";
import { safeNumber } from "@/lib/admin-messages-utils";
import { consumeAdminMessagesNavTarget } from "@/lib/admin/adminMessagesNav";
import { useAdminAnnouncements } from "@/hooks/admin/useAdminAnnouncements";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import { AdminAnnouncementsSection } from "@/components/admin/messages/AdminAnnouncementsSection";
import { AdminTeamsListSection } from "@/components/admin/messages/AdminTeamsListSection";

const TAB_CONFIG: {
  key: HeaderTabKey;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: "inbox", label: "Inbox", icon: "mail", color: "#30B0C7" },
  { key: "announcement", label: "Announcements", icon: "bell", color: "#7B61FF" },
  { key: "teams", label: "Teams", icon: "users", color: "#34C759" },
  { key: "stats", label: "Stats", icon: "bar-chart-2", color: "#FFB020" },
];

export default function AdminMessagesScreen() {
  const { colors, isDark } = useAppTheme();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const myUserIdRaw = useAppSelector((state) => state.user.profile?.id) ?? null;
  const myUserId = useMemo(() => {
    if (myUserIdRaw == null) return null;
    const n = Number(myUserIdRaw);
    return Number.isFinite(n) ? n : null;
  }, [myUserIdRaw]);

  const [pendingTarget] = useState(() => consumeAdminMessagesNavTarget());
  const initialUserId = pendingTarget?.userId ?? null;

  const [activeTab, setActiveTab] = useState<HeaderTabKey>("inbox");

  const canLoad = Boolean(token && bootstrapReady);
  const dms = useAdminDms(token, canLoad);
  const groups = useAdminGroups(token, canLoad);
  const announcements = useAdminAnnouncements(token, canLoad);
  const teams = useAdminTeams(token, canLoad);

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
      announcements: announcements.items.length,
      teams: teams.teams.length,
    }),
    [
      announcements.items.length,
      dmUnreadTotal,
      dms.threads.length,
      groupUnreadTotal,
      groups.groups.length,
      teams.teams.length,
    ],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(360)}
        style={{ paddingTop: 40, paddingHorizontal: 24, marginBottom: 28 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <View
            style={{
              width: 5,
              height: 36,
              borderRadius: 3,
              backgroundColor: "#30B0C7",
            }}
          />
          <View>
            <Text
              style={{
                fontFamily: "Telma-Bold",
                fontSize: 44,
                color: colors.textPrimary,
                letterSpacing: -1,
                lineHeight: 48,
              }}
            >
              Messages
            </Text>
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Inbox · Announcements · Teams
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Tab Switcher */}
      <Animated.View
        entering={FadeInDown.delay(120).duration(360)}
        style={{ paddingHorizontal: 24, marginBottom: 20 }}
      >
        <View
          style={{
            flexDirection: "row",
            padding: 5,
            borderRadius: 24,
            borderWidth: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
            borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
            gap: 4,
          }}
        >
          {TAB_CONFIG.map((t) => {
            const isActive = activeTab === t.key;
            const hasDot =
              (t.key === "inbox" && dmUnreadTotal > 0) ||
              (t.key === "teams" && groupUnreadTotal > 0);
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                  backgroundColor: isActive
                    ? isDark ? `${t.color}22` : `${t.color}16`
                    : "transparent",
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive
                    ? isDark ? `${t.color}35` : `${t.color}28`
                    : "transparent",
                }}
              >
                <View style={{ position: "relative" }}>
                  <Feather
                    name={t.icon as any}
                    size={16}
                    color={isActive ? t.color : colors.textSecondary}
                  />
                  {hasDot && (
                    <View
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -3,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: t.color,
                      }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 13,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: isActive ? t.color : colors.textSecondary,
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Content Area */}
      <Animated.View
        entering={FadeInDown.delay(180).duration(360)}
        style={{ flex: 1 }}
      >
        {!canLoad ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={colors.accent} />
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 14,
              }}
            >
              Loading messages...
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {activeTab === "inbox" && (
              <AdminDmSection
                token={token}
                canLoad={canLoad}
                myUserId={myUserId}
                initialUserId={initialUserId}
              />
            )}
            {activeTab === "announcement" && (
              <AdminAnnouncementsSection controller={announcements} canLoad={canLoad} />
            )}
            {activeTab === "teams" && (
              <AdminTeamsListSection controller={teams} canLoad={canLoad} />
            )}
            {activeTab === "stats" && <AdminStatsSection stats={stats} />}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

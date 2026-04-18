import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppSelector } from "@/store/hooks";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { HeaderTabKey } from "@/types/admin-messages";
import { Chip } from "@/components/admin/AdminShared";
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
import { AdminCard } from "@/roles/admin/components/AdminCard";

export default function AdminMessagesScreen() {
  const { colors } = useAppTheme();
  const insets = useAppSafeAreaInsets();
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

        <AdminCard className="rounded-card-lg border border-app bg-card-elevated p-5">
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
            </>
          )}
        </AdminCard>
      </ThemedScrollView>
    </View>
  );
}

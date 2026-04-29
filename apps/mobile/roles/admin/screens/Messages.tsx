import { useAppSelector } from "@/store/hooks";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Bell, Mail, Users, type LucideIcon } from "lucide-react-native";

import { HeaderTabKey } from "@/types/admin-messages";
import { AdminDmSection } from "@/components/admin/messages/AdminDmSection";
import { useAdminDms } from "@/hooks/admin/useAdminDms";
import { useAdminGroups } from "@/hooks/admin/useAdminGroups";
import { safeNumber } from "@/lib/admin-messages-utils";
import { consumeAdminMessagesNavTarget } from "@/lib/admin/adminMessagesNav";
import { useAdminAnnouncements } from "@/hooks/admin/useAdminAnnouncements";
import { AdminAnnouncementsSection } from "@/components/admin/messages/AdminAnnouncementsSection";
import { AdminGroupSection } from "@/components/admin/messages/AdminGroupSection";
import {
  AdminHeader,
  AdminLoadingState,
  AdminScreen,
  AdminSegmentedTabs,
} from "@/components/admin/AdminUI";
import { warmAdminMessagesCache } from "@/lib/admin/adminMessageCache";

const TAB_CONFIG: {
  key: HeaderTabKey;
  label: string;
  icon: LucideIcon;
  tone: "info" | "accent" | "success";
}[] = [
  { key: "inbox", label: "Inbox", icon: Mail, tone: "info" },
  { key: "announcement", label: "Announce", icon: Bell, tone: "accent" },
  { key: "teams", label: "Teams", icon: Users, tone: "success" },
];

export default function AdminMessagesScreen() {
  const token = useAppSelector((state) => state.user.token);
  const myUserIdRaw = useAppSelector((state) => state.user.profile?.id) ?? null;
  const myUserId = useMemo(() => {
    if (myUserIdRaw == null) return null;
    const n = Number(myUserIdRaw);
    return Number.isFinite(n) ? n : null;
  }, [myUserIdRaw]);

  const [pendingTarget] = useState(() => consumeAdminMessagesNavTarget());
  const initialUserId = pendingTarget?.userId ?? null;

  const [activeTab, setActiveTab] = useState<HeaderTabKey>("inbox");

  // (tabs)/_layout already gates the entire UI on bootstrapReady — no need to re-gate here.
  // Re-gating only delayed the first render of admin messages by an extra cycle.
  const canLoad = Boolean(token);
  const dms = useAdminDms(token, canLoad);
  const groups = useAdminGroups(token, canLoad);
  const announcements = useAdminAnnouncements(token, canLoad);

  useEffect(() => {
    if (!token || !canLoad) return;
    const timeout = setTimeout(() => {
      void warmAdminMessagesCache(token);
    }, 250);
    return () => clearTimeout(timeout);
  }, [canLoad, token]);

  const dmUnreadTotal = useMemo(() => {
    return dms.threads.reduce((sum, t) => sum + safeNumber(t.unread, 0), 0);
  }, [dms.threads]);

  const teamUnreadTotal = useMemo(() => {
    return groups.groups
      .filter((g) => String(g.category ?? "").toLowerCase() === "team")
      .reduce((sum, g) => sum + safeNumber(g.unreadCount, 0), 0);
  }, [groups.groups]);

  const tabs = TAB_CONFIG.map((tab) => ({
    ...tab,
    badgeCount:
      tab.key === "inbox"
        ? dmUnreadTotal
        : tab.key === "teams"
          ? teamUnreadTotal
          : 0,
  }));

  return (
    <AdminScreen>
      <AdminHeader
        eyebrow="Admin"
        title="Messages"
        subtitle="Direct inbox, announcements, and team conversations"
        tone="info"
      />

      <AdminSegmentedTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      <View style={{ flex: 1 }}>
        {!canLoad ? (
          <AdminLoadingState label="Loading messages" />
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
              <AdminGroupSection
                token={token}
                canLoad={canLoad}
                myUserId={myUserId}
                category="team"
              />
            )}
          </View>
        )}
      </View>
    </AdminScreen>
  );
}

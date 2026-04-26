import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import ScheduleScreen from "@/app/(tabs)/schedule";
import TrackingLayout from "@/app/(tabs)/tracking/_layout";
import TeamMessagesScreen from "@/roles/team/screens/Messages";
import { useBaseLayoutLogic } from "../shared/useBaseLayoutLogic";
import { TEAM_MANAGER_TAB_ROUTES } from "./tabs";
import TeamManagerHomeScreen from "./screens/Home";
import TeamManagerManageScreen from "./screens/Manage";
import TeamManagerProfileScreen from "./screens/Profile";

const TrackingWrapper = React.memo(() => <TrackingLayout />);

export function TeamManagerLayout() {
  const { token, profile, capabilities } = useAppSelector((state) => state.user);
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, true, profile.id);

  const visibleTabs = useMemo(() => {
    return TEAM_MANAGER_TAB_ROUTES.map((tab) => {
      if (tab.key === "schedule" && capabilities && !capabilities.schedule) return null;
      if (tab.key === "tracking" && capabilities && !capabilities.teamTracking) return null;
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      return tab;
    }).filter((tab): tab is (typeof TEAM_MANAGER_TAB_ROUTES)[number] => Boolean(tab));
  }, [capabilities, messagesUnread]);

  const tabComponents = useMemo(
    () => ({
      "manager-home": React.memo(TeamManagerHomeScreen),
      "manager-manage": React.memo(TeamManagerManageScreen),
      messages: React.memo(TeamMessagesScreen),
      schedule: React.memo(ScheduleScreen),
      tracking: TrackingWrapper,
      "manager-profile": React.memo(TeamManagerProfileScreen),
    }),
    [],
  );

  const { initialIndex, handleIndexChange, screens } = useBaseLayoutLogic(visibleTabs, tabComponents);

  return (
    <SwipeableTabLayout tabs={visibleTabs} initialIndex={initialIndex} onIndexChange={handleIndexChange}>
      {screens}
    </SwipeableTabLayout>
  );
}

import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import { TEAM_MODE_TAB_ROUTES, SHARED_TAB_COMPONENTS } from "@/constants/navigation";
import { useBaseLayoutLogic } from "../useBaseLayoutLogic";
import { canUseCoachMessaging } from "@/lib/messagingAccess";

export function TeamLayout() {
  const { token, profile, programTier, messagingAccessTiers, appRole } = useAppSelector((state) => state.user);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, hasMessaging, profile.id);

  const isYouth = typeof appRole === "string" && appRole.startsWith("youth_");

  const visibleTabs = useMemo(() => {
    let tabs = [...TEAM_MODE_TAB_ROUTES];
    if (isYouth) {
      tabs = tabs.filter((tab) => tab.key !== "tracking");
    }
    return tabs.map((tab) => {
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      return tab;
    });
  }, [messagesUnread, isYouth]);

  const { initialIndex, handleIndexChange, screens } = useBaseLayoutLogic(visibleTabs, SHARED_TAB_COMPONENTS);

  return (
    <SwipeableTabLayout
      tabs={visibleTabs}
      initialIndex={initialIndex}
      onIndexChange={handleIndexChange}
    >
      {screens}
    </SwipeableTabLayout>
  );
}

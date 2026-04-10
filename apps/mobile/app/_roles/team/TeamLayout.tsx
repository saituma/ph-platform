import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import { SHARED_TAB_COMPONENTS } from "../shared/tabComponents";
import { useBaseLayoutLogic } from "../shared/useBaseLayoutLogic";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { TEAM_TAB_ROUTES } from "./tabs";

export function TeamLayout() {
  const { token, profile, programTier, messagingAccessTiers, appRole } = useAppSelector((state) => state.user);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, hasMessaging, profile.id);

  const isYouth = typeof appRole === "string" && appRole.startsWith("youth_");

  const visibleTabs = useMemo(() => {
    let tabs = [...TEAM_TAB_ROUTES];
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

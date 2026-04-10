import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import { DEFAULT_TAB_ROUTES, SHARED_TAB_COMPONENTS } from "@/constants/navigation";
import { useBaseLayoutLogic } from "../useBaseLayoutLogic";
import { canUseCoachMessaging } from "@/lib/messagingAccess";

export function YouthGuardianLayout() {
  const { token, profile, programTier, messagingAccessTiers } = useAppSelector((state) => state.user);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, hasMessaging, profile.id);

  const visibleTabs = useMemo(() => {
    return DEFAULT_TAB_ROUTES
      .filter((tab) => tab.key !== "tracking")
      .map((tab) => {
        if (tab.key === "messages") {
          return { ...tab, badgeCount: messagesUnread };
        }
        return tab;
      });
  }, [messagesUnread]);

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

import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import { SHARED_TAB_COMPONENTS } from "../shared/tabComponents";
import { useBaseLayoutLogic } from "../shared/useBaseLayoutLogic";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { TEAM_TAB_ROUTES } from "./tabs";
import TeamMessagesScreen from "./screens/Messages";

export function TeamLayout() {
  const { token, profile, programTier, messagingAccessTiers } = useAppSelector((state) => state.user);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, hasMessaging, profile.id);

  const visibleTabs = useMemo(() => {
    return TEAM_TAB_ROUTES.map((tab) => {
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      return tab;
    });
  }, [messagesUnread]);

  const tabComponents = useMemo(
    () => ({
      ...SHARED_TAB_COMPONENTS,
      messages: React.memo(TeamMessagesScreen),
    }),
    [],
  );

  const { initialIndex, handleIndexChange, screens } = useBaseLayoutLogic(
    visibleTabs,
    tabComponents,
  );

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

import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import { SHARED_TAB_COMPONENTS } from "../shared/tabComponents";
import { useBaseLayoutLogic } from "../shared/useBaseLayoutLogic";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { ADULT_TAB_ROUTES } from "./tabs";
import AdultMessagesScreen from "./screens/Messages";
import { filterTabsByCapabilities } from "../shared/capabilityTabs";

export function AdultLayout() {
  const { token, profile, programTier, messagingAccessTiers, capabilities } = useAppSelector((state) => state.user);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, hasMessaging, profile.id);

  const visibleTabs = useMemo(() => {
    return filterTabsByCapabilities(ADULT_TAB_ROUTES, capabilities).map((tab) => {
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      return tab;
    });
  }, [capabilities, messagesUnread]);

  const tabComponents = useMemo(
    () => ({
      ...SHARED_TAB_COMPONENTS,
      messages: React.memo(AdultMessagesScreen),
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

import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import { SHARED_TAB_COMPONENTS } from "../shared/tabComponents";
import { useBaseLayoutLogic } from "../shared/useBaseLayoutLogic";
import { YOUTH_TAB_ROUTES } from "./tabs";
import YouthMessagesScreen from "./screens/Messages";

export function YouthLayout() {
  const { token, profile } = useAppSelector((state) => state.user);
  /** Always show Messages like adult/team; eligibility is enforced server-side. Hiding the tab stranded users when tier/API lists lagged. */
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, true, profile.id);

  const visibleTabs = useMemo(() => {
    return YOUTH_TAB_ROUTES.map((tab) => {
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      return tab;
    });
  }, [messagesUnread]);

  const tabComponents = useMemo(
    () => ({
      ...SHARED_TAB_COMPONENTS,
      messages: React.memo(YouthMessagesScreen),
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

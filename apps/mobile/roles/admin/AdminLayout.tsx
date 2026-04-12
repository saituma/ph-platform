import React, { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useCoachUnreadMessaging } from "@/hooks/navigation/useCoachUnreadMessaging";
import { useBaseLayoutLogic } from "../shared/useBaseLayoutLogic";
import { ADMIN_TAB_ROUTES } from "./tabs";
import { ADMIN_TAB_COMPONENTS } from "./tabComponents";

export function AdminLayout() {
  const token = useAppSelector((state) => state.user.token);
  const { unreadCount: adminMessagesUnread } = useCoachUnreadMessaging(token, true);

  const visibleTabs = useMemo(() => {
    return ADMIN_TAB_ROUTES.map((tab) => {
      if (tab.key === "admin-messages") {
        return { ...tab, badgeCount: adminMessagesUnread };
      }
      return tab;
    });
  }, [adminMessagesUnread]);

  const { initialIndex, handleIndexChange, screens } = useBaseLayoutLogic(
    visibleTabs,
    ADMIN_TAB_COMPONENTS,
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

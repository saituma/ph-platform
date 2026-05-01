import React, { useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { SwipeableTabLayout } from "@/components/navigation";
import { useUnreadMessaging } from "@/hooks/navigation/useUnreadMessaging";
import { SHARED_TAB_COMPONENTS } from "../shared/tabComponents";
import { useBaseLayoutLogic } from "../shared/useBaseLayoutLogic";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { TEAM_TAB_ROUTES, TEAM_YOUTH_TAB_ROUTES } from "./tabs";
import TeamMessagesScreen from "./screens/Messages";
import { canAccessTrackingTab } from "@/lib/tracking/teamTrackingGate";
import { filterTabsByCapabilities } from "../shared/capabilityTabs";

export function TeamLayout() {
  const {
    token,
    profile,
    programTier,
    messagingAccessTiers,
    planFeatures,
    appRole,
    authTeamMembership,
    managedAthletes,
    capabilities,
    capabilitiesLoaded,
  } = useAppSelector((state) => state.user);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers, planFeatures);
  const { unreadCount: messagesUnread } = useUnreadMessaging(token, hasMessaging, profile.id);
  const canUseTracking = canAccessTrackingTab({
    appRole,
    capabilities,
    authTeamMembership,
    firstManagedAthlete: managedAthletes[0] ?? null,
  });

  const isYouthTeam = appRole === "youth_athlete_team_guardian";
  const baseTabs = isYouthTeam ? TEAM_YOUTH_TAB_ROUTES : TEAM_TAB_ROUTES;

  if (!capabilitiesLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const visibleTabs = useMemo(() => {
    return filterTabsByCapabilities(baseTabs, capabilities).filter((tab) => canUseTracking || tab.key !== "tracking").map((tab) => {
      if (tab.key === "messages") {
        return { ...tab, badgeCount: messagesUnread };
      }
      return tab;
    });
  }, [baseTabs, canUseTracking, capabilities, messagesUnread]);

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

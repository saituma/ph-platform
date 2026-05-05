import React, { useMemo } from "react";
import { View } from "react-native";
import { shallowEqual } from "react-redux";
import { useAppSelector } from "@/store/hooks";
import { isAdminRole } from "@/lib/isAdminRole";
import { canUseCoachMessaging } from "@/lib/messagingAccess";

import { AdminLayout } from "@/roles/admin/AdminLayout";
import { AdultLayout } from "@/roles/adult/AdultLayout";
import { TeamLayout } from "@/roles/team/TeamLayout";
import { TeamManagerLayout } from "@/roles/team-manager/TeamManagerLayout";
import { YouthLayout } from "@/roles/youth/YouthLayout";

import { usePushNotificationResponses } from "@/hooks/navigation/usePushNotificationResponses";
import { useProfileSync } from "@/hooks/navigation/useProfileSync";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";

// Ensure `router.replace("/(tabs)")` and cold starts land on Home, not Programs.
export const unstable_settings = {
  initialRouteName: "index",
};

/**
 * Core Tab Layout that delegates rendering to role-specific layouts.
 */
function TabLayout() {
  const {
    hydrated, token, profile, appRole, apiUserRole,
    programTier, messagingAccessTiers, planFeatures,
    isAuthenticated,
  } = useAppSelector((state) => ({
    hydrated: state.user.hydrated,
    token: state.user.token,
    profile: state.user.profile,
    appRole: state.user.appRole,
    apiUserRole: state.user.apiUserRole,
    programTier: state.user.programTier,
    messagingAccessTiers: state.user.messagingAccessTiers,
    planFeatures: state.user.planFeatures,
    isAuthenticated: state.user.isAuthenticated,
  }), shallowEqual);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  const effectiveAuth = forceLogout
    ? false
    : isAuthenticated && !!token && !!profile.id;

  const isAdmin = isAdminRole(apiUserRole);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers, planFeatures);

  // Shared Logic Hooks
  usePushNotificationResponses(effectiveAuth && bootstrapReady);
  useProfileSync(token, effectiveAuth && bootstrapReady, hasMessaging);

  const containerStyle = useMemo(() => [
    { flex: 1, backgroundColor: "transparent" } as const,
  ], []);

  if (!hydrated || (effectiveAuth && !bootstrapReady)) {
    return null;
  }

  if (!effectiveAuth) {
    return <ReplaceOnce href="/(auth)/login" />;
  }

  // Role Switching Logic
  const renderRoleLayout = () => {
    if (isAdmin || appRole === "coach") {
      return <AdminLayout />;
    }
    if (appRole === "team_manager") {
      return <TeamManagerLayout />;
    }
    if (appRole === "adult_athlete") {
      return <AdultLayout />;
    }
    if (
      appRole === "team" ||
      appRole === "adult_athlete_team" ||
      appRole === "youth_athlete_team_guardian"
    ) {
      return <TeamLayout />;
    }
    // Default fallback for youth_athlete (Guardian mode)
    return <YouthLayout />;
  };

  return <View style={containerStyle}>{renderRoleLayout()}</View>;
}

export default TabLayout;

import React, { useEffect } from "react";
import { View } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
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

export default function TabLayout() {
  const hydrated = useAppSelector((state) => state.user.hydrated);
  const token = useAppSelector((state) => state.user.token);
  const profile = useAppSelector((state) => state.user.profile);
  const appRole = useAppSelector((state) => state.user.appRole);
  const apiUserRole = useAppSelector((state) => state.user.apiUserRole);
  const programTier = useAppSelector((state) => state.user.programTier);
  const messagingAccessTiers = useAppSelector((state) => state.user.messagingAccessTiers);
  const planFeatures = useAppSelector((state) => state.user.planFeatures);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  const effectiveAuth = forceLogout
    ? false
    : isAuthenticated && !!token && !!profile.id;

  const isAdmin = isAdminRole(apiUserRole);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers, planFeatures);

  useEffect(() => {
    if (!effectiveAuth || !bootstrapReady || !token) return;
    let cancelled = false;
    const actingHeaders = athleteUserId
      ? { "X-Acting-User-Id": String(athleteUserId) }
      : undefined;

    (async () => {
      try {
        const [inboxData] = await Promise.all([
          apiRequest<{ threads?: Array<{ type?: string; groupId?: number; id?: string }> }>("/messages/inbox", {
            token,
            headers: actingHeaders,
            suppressLog: true,
            suppressStatusCodes: [401, 403],
          }),
          apiRequest("/messages", {
            token,
            headers: actingHeaders,
            suppressLog: true,
            suppressStatusCodes: [401, 403],
          }),
        ]);
        if (cancelled) return;
        const topGroupIds = (inboxData?.threads ?? [])
          .filter((thread) => thread?.type === "group")
          .slice(0, 4)
          .map((thread) =>
            Number(
              thread.groupId ??
                String(thread.id ?? "").replace("group:", ""),
            ),
          )
          .filter((id) => Number.isFinite(id) && id > 0);
        for (const groupId of topGroupIds) {
          void apiRequest(`/chat/groups/${groupId}/messages`, {
            token,
            headers: actingHeaders,
            suppressLog: true,
            suppressStatusCodes: [401, 403],
          });
        }
      } catch {
        // Warmup should never block app flow.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveAuth, bootstrapReady, token, athleteUserId]);

  // Shared Logic Hooks
  usePushNotificationResponses(effectiveAuth && bootstrapReady);
  useProfileSync(token, effectiveAuth && bootstrapReady, hasMessaging);

  const containerStyle = [
    {
      flex: 1,
      backgroundColor: "transparent",
    },
  ];

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

import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { usePathname, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { isAdminRole } from "@/lib/isAdminRole";
import { canUseCoachMessaging } from "@/lib/messagingAccess";

import { AdminLayout } from "@/roles/admin/AdminLayout";
import { AdultLayout } from "@/roles/adult/AdultLayout";
import { TeamLayout } from "@/roles/team/TeamLayout";
import { YouthLayout } from "@/roles/youth/YouthLayout";

import { usePushNotificationResponses } from "@/hooks/navigation/usePushNotificationResponses";
import { useProfileSync } from "@/hooks/navigation/useProfileSync";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { parsePrimaryTabSegment } from "@/roles/shared/useBaseLayoutLogic";

// Ensure `router.replace("/(tabs)")` and cold starts land on Home, not Programs.
export const unstable_settings = {
  initialRouteName: "index",
};

export default function TabLayout() {
  const {
    hydrated,
    token,
    profile,
    appRole,
    apiUserRole,
    programTier,
    messagingAccessTiers,
    isAuthenticated,
  } = useAppSelector((state) => state.user);

  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  const effectiveAuth = forceLogout
    ? false
    : isAuthenticated && !!token && !!profile.id;

  const pathname = usePathname();
  const router = useRouter();
  const didNormalizeLaunchRoute = useRef(false);

  const isAdmin = isAdminRole(apiUserRole);
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);

  // Cold start sometimes restores `/(tabs)/programs` as the shell route. Without a matching URL when
  // switching tabs, the pager and pathname fight — e.g. Tracking shows Programs. If there was no
  // deep link, normalize top-level Programs to Home once.
  useEffect(() => {
    if (!effectiveAuth || !bootstrapReady || didNormalizeLaunchRoute.current) return;
    if (!pathname) return;

    let cancelled = false;
    Linking.getInitialURL().then((url) => {
      if (cancelled) return;
      if (url) {
        didNormalizeLaunchRoute.current = true;
        return;
      }
      const routeName = parsePrimaryTabSegment(pathname);
      const normalizedPath = pathname.replace(/^\//, "").replace(/^\(tabs\)\/?/, "");
      const segments = normalizedPath.split("/").filter(Boolean);
      if (routeName === "programs" && segments.length === 1) {
        router.replace("/(tabs)");
      }
      didNormalizeLaunchRoute.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveAuth, bootstrapReady, pathname, router]);

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
    if (appRole === "adult_athlete") {
      return <AdultLayout />;
    }
    if (appRole === "team") {
      return <TeamLayout />;
    }
    // Default fallback for youth_athlete (Guardian mode)
    return <YouthLayout />;
  };

  return <View style={containerStyle}>{renderRoleLayout()}</View>;
}

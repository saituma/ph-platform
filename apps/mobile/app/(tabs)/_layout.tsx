import React, { useEffect } from "react";
import { View } from "react-native";
import { Redirect, Slot, useRouter, usePathname, useSegments } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { isAdminRole } from "@/lib/isAdminRole";
import { canUseCoachMessaging } from "@/lib/messagingAccess";

import { CoachLayout } from "@/components/roles/coach/CoachLayout";
import { AdultLayout } from "@/components/roles/adult/AdultLayout";
import { TeamLayout } from "@/components/roles/team/TeamLayout";
import { YouthGuardianLayout } from "@/components/roles/youth_guardian/YouthGuardianLayout";

import { usePushNotificationResponses } from "@/hooks/navigation/usePushNotificationResponses";
import { useProfileSync } from "@/hooks/navigation/useProfileSync";

import { FirstLoginWalkthrough } from "@/components/onboarding/FirstLoginWalkthrough";

export default function TabLayout() {
  const {
    hydrated,
    token,
    profile,
    onboardingCompleted,
    appRole,
    apiUserRole,
    programTier,
    messagingAccessTiers,
    isAuthenticated,
  } = useAppSelector((state) => state.user);
  
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  const forceLogout =
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "1" ||
    process.env.EXPO_PUBLIC_FORCE_LOGOUT === "true";
  const effectiveAuth = forceLogout ? false : isAuthenticated && !!token && !!profile.id;

  const isAdmin = isAdminRole(apiUserRole);
  const isOnboarding = segments.some((segment) => segment === "onboarding") || pathname.includes("/onboarding");
  const hasMessaging = canUseCoachMessaging(programTier, messagingAccessTiers);

  // Shared Logic Hooks
  usePushNotificationResponses(effectiveAuth && bootstrapReady);
  useProfileSync(token, effectiveAuth && bootstrapReady, hasMessaging);

  useEffect(() => {
    if (!effectiveAuth || !bootstrapReady) return;
    if (!isAdmin && onboardingCompleted === false && !isOnboarding) {
      router.replace("/(tabs)/onboarding");
    }
  }, [
    bootstrapReady,
    effectiveAuth,
    isAdmin,
    onboardingCompleted,
    isOnboarding,
    router,
  ]);

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
    return <Redirect href="/(auth)/login" />;
  }

  if (isOnboarding) {
    return (
      <View style={containerStyle}>
        <Slot />
      </View>
    );
  }

  // Role Switching Logic
  const renderRoleLayout = () => {
    if (isAdmin || appRole === "coach") {
      return <CoachLayout />;
    }
    if (appRole === "adult_athlete") {
      return <AdultLayout />;
    }
    if (
      appRole === "youth_athlete_team_guardian" ||
      appRole === "adult_athlete_team"
    ) {
      return <TeamLayout />;
    }
    // Default fallback for youth guardian or other athlete states
    return <YouthGuardianLayout />;
  };

  return (
    <View style={containerStyle}>
      {renderRoleLayout()}
      <FirstLoginWalkthrough />
    </View>
  );
}

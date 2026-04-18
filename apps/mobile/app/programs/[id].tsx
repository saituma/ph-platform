import React, { useEffect, useLayoutEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { ProgramId } from "@/constants/program-details";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";
import { useAppSelector } from "@/store/hooks";
import { programDetailRouteIdFromTier } from "@/lib/planAccess";
import { selectBootstrapReady } from "@/store/slices/appSlice";
import { View } from "react-native";

export default function ProgramDetailScreen() {
  const { id, sharedBoundTag } = useLocalSearchParams<{ id: ProgramId; sharedBoundTag?: string }>();
  const router = useRouter();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const programTier = useAppSelector((state) => state.user.programTier);
  const appRole = useAppSelector((state) => state.user.appRole);
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const canGoBack = router.canGoBack();
  const programId =
    id && ["php", "plus", "premium", "pro"].includes(id) ? (id as ProgramId) : "php";
  const didRedirectRef = useRef(false);
  const role = String(appRole ?? "");
  const isYouthRole =
    role === "youth_athlete" || role.startsWith("youth_athlete_");
  const isRootRestore = !canGoBack;
  const shouldHideDetailWhileBootstrapping =
    isAuthenticated && isRootRestore && !bootstrapReady;
  const shouldHideDetailForYouthRoot =
    bootstrapReady && isYouthRole && isRootRestore;

  /**
   * Youth users should land on the Home tab on cold start.
   * If this deep program route becomes the root screen (no back stack), redirect to Home.
   */
  useLayoutEffect(() => {
    if (!bootstrapReady) return;
    if (!isYouthRole) return;
    if (canGoBack) return;
    if (didRedirectRef.current) return;
    didRedirectRef.current = true;
    router.replace("/" as any);
  }, [bootstrapReady, canGoBack, isYouthRole, router]);

  /** Keep URL in sync when `programTier` hydrates (e.g. was null → real tier). Skip while tier unknown so shared `/programs/...` links are not rewritten prematurely. */
  useEffect(() => {
    if (!bootstrapReady) return;
    if (isYouthRole && isRootRestore) return;
    if (programTier == null || String(programTier).trim() === "") return;
    const expected = programDetailRouteIdFromTier(programTier);
    if (expected === programId) return;
    router.replace(`/programs/${expected}` as any);
  }, [bootstrapReady, isRootRestore, isYouthRole, programId, programTier, router]);

  // Prevent a brief flash of the program detail UI while auth/profile is still hydrating
  // on cold start restores (when this deep route becomes the first screen).
  // Also: if this deep route is the root screen for a youth account, avoid rendering
  // the detail UI at all (router.replace runs in a layout effect).
  if (shouldHideDetailWhileBootstrapping || shouldHideDetailForYouthRoot) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/programs");
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <SafeMaskedView style={{ flex: 1 }}>
        <ProgramDetailPanel
          programId={programId}
          showBack
          onBack={handleBack}
          onNavigate={(path) => router.push(path as any)}
          sharedBoundTag={sharedBoundTag}
        />
      </SafeMaskedView>
    </SafeAreaView>
  );
}

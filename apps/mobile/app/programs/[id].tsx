import React, { useEffect, useLayoutEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
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
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const canGoBack = router.canGoBack();
  const programId =
    id && ["php", "plus", "premium", "pro"].includes(id) ? (id as ProgramId) : "php";
  const isRootRestore = !canGoBack;

  /** When this screen is the stack root (restored state), wait for `getInitialURL` before showing UI or redirecting. */
  const [rootLaunchResolved, setRootLaunchResolved] = useState(canGoBack);

  /**
   * Cold start often restores `/programs/[id]` as the only route. Send users to the tab shell (Home)
   * unless they opened the app via a real deep link (`getInitialURL` set). Previously only youth
   * accounts were redirected; adults stayed stuck on this screen with no tab bar.
   */
  useLayoutEffect(() => {
    if (!bootstrapReady) return;
    if (canGoBack) {
      setRootLaunchResolved(true);
      return;
    }
    let cancelled = false;
    Linking.getInitialURL().then((url) => {
      if (cancelled) return;
      if (url) {
        setRootLaunchResolved(true);
        return;
      }
      router.replace("/(tabs)");
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrapReady, canGoBack, router]);

  const shouldHideDetailWhileBootstrapping =
    isAuthenticated && isRootRestore && !bootstrapReady;
  const shouldHideDetailUntilRootLaunchResolved =
    bootstrapReady && isRootRestore && !rootLaunchResolved;

  /** Keep URL in sync when `programTier` hydrates (e.g. was null → real tier). Skip while tier unknown so shared `/programs/...` links are not rewritten prematurely. */
  useEffect(() => {
    if (!bootstrapReady) return;
    if (!rootLaunchResolved) return;
    if (programTier == null || String(programTier).trim() === "") return;
    const expected = programDetailRouteIdFromTier(programTier);
    if (expected === programId) return;
    router.replace(`/programs/${expected}` as any);
  }, [bootstrapReady, rootLaunchResolved, programId, programTier, router]);

  // Prevent a brief flash of the program detail UI while auth/profile is still hydrating
  // on cold start restores (when this deep route becomes the first screen), or while we
  // decide whether this launch was a deep link vs state restore.
  if (shouldHideDetailWhileBootstrapping || shouldHideDetailUntilRootLaunchResolved) {
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

import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { ProgramId } from "@/constants/program-details";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";
import { useAppSelector } from "@/store/hooks";
import { programDetailRouteIdFromTier } from "@/lib/planAccess";

export default function ProgramDetailScreen() {
  const { id, sharedBoundTag } = useLocalSearchParams<{ id: ProgramId; sharedBoundTag?: string }>();
  const router = useRouter();
  const programTier = useAppSelector((state) => state.user.programTier);
  const appRole = useAppSelector((state) => state.user.appRole);
  const programId =
    id && ["php", "plus", "premium", "pro"].includes(id) ? (id as ProgramId) : "php";

  /**
   * Youth users should land on the Home tab on cold start.
   * If this deep program route becomes the root screen (no back stack), redirect to Home.
   */
  useEffect(() => {
    const role = String(appRole ?? "");
    const isYouth = role === "youth_athlete" || role.startsWith("youth_athlete_");
    if (!isYouth) return;
    if (router.canGoBack()) return;
    router.replace("/" as any);
  }, [appRole, router]);

  /** Keep URL in sync when `programTier` hydrates (e.g. was null → real tier). Skip while tier unknown so shared `/programs/...` links are not rewritten prematurely. */
  useEffect(() => {
    if (programTier == null || String(programTier).trim() === "") return;
    const expected = programDetailRouteIdFromTier(programTier);
    if (expected === programId) return;
    router.replace(`/programs/${expected}` as any);
  }, [programId, programTier, router]);

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

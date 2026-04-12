import React from "react";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { ProgramId } from "@/constants/program-details";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";

export default function ProgramDetailScreen() {
  const { id, sharedBoundTag } = useLocalSearchParams<{ id: ProgramId; sharedBoundTag?: string }>();
  const router = useRouter();
  const programId =
    id && ["php", "plus", "premium", "pro"].includes(id) ? (id as ProgramId) : "php";
  useEffect(() => {
    if (router.canGoBack()) return;
    router.replace("/(tabs)");
  }, [router]);
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

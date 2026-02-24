import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { ProgramId } from "@/constants/program-details";

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: ProgramId }>();
  const router = useRouter();
  const programId =
    id && ["php", "plus", "premium"].includes(id) ? (id as ProgramId) : "php";

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ProgramDetailPanel
        programId={programId}
        showBack
        onBack={() => router.back()}
        onNavigate={(path) => router.push(path as any)}
      />
    </SafeAreaView>
  );
}

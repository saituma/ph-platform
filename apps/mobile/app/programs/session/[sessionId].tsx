import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, View, Pressable, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";
import { Shadows } from "@/constants/theme";
import { VideoUploadPanel } from "@/components/programs/ProgramPanels";
import { ProgramId } from "@/constants/program-details";

import { useSessionData } from "@/hooks/programs/useSessionData";
import { useSessionNavigation } from "@/hooks/programs/useSessionNavigation";
import { useSessionUploads } from "@/hooks/programs/useSessionUploads";
import { SessionExerciseBlock } from "@/components/programs/SessionExerciseBlock";

export default function ProgramSessionDetailScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { sessionId, programId, moduleId } = useLocalSearchParams<{
    sessionId: string;
    programId: ProgramId;
    moduleId: string;
  }>();
  const { token, programTier, athleteUserId, managedAthletes } = useAppSelector(
    (state) => state.user,
  );

  const activeAge = useMemo(() => {
    const selected =
      managedAthletes.find(
        (a) => a.id === athleteUserId || a.userId === athleteUserId,
      ) ?? managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const { workspace, isLoading, load, findModuleAndSession } = useSessionData(
    token,
    activeAge,
  );
  const { module, session } = findModuleAndSession(
    Number(sessionId),
    Number(moduleId),
  );
  const next = useSessionNavigation(
    workspace,
    module,
    session,
    programId as ProgramId,
  );
  const { uploadsBySectionId, hasUploadedBySectionId, loadUploadsForSection } =
    useSessionUploads(token, athleteUserId);

  const [uploadTarget, setUploadTarget] = useState<{
    sectionContentId: number;
    sectionTitle: string;
    autoPickSource?: "camera" | "library";
  } | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session?.items) return;
    session.items
      .filter((i) => i.allowVideoUpload)
      .forEach((i) => loadUploadsForSection(i.id));
  }, [session, loadUploadsForSection]);

  const warmupItems = useMemo(
    () => session?.items.filter((i) => i.blockType === "warmup") ?? [],
    [session],
  );
  const mainItems = useMemo(
    () => session?.items.filter((i) => i.blockType === "main") ?? [],
    [session],
  );
  const cooldownItems = useMemo(
    () => session?.items.filter((i) => i.blockType === "cooldown") ?? [],
    [session],
  );

  const completionAnchorItemId = useMemo(() => {
    const lastCooldown = cooldownItems[cooldownItems.length - 1];
    const lastMain = mainItems[mainItems.length - 1];
    const lastWarmup = warmupItems[warmupItems.length - 1];
    return (lastCooldown ?? lastMain ?? lastWarmup)?.id;
  }, [cooldownItems, mainItems, warmupItems]);

  const handleUploadPress = useCallback((id: number, title: string) => {
    Alert.alert("Video Upload", "Choose an action", [
      {
        text: "Record",
        onPress: () =>
          setUploadTarget({
            sectionContentId: id,
            sectionTitle: title,
            autoPickSource: "camera",
          }),
      },
      {
        text: "Library",
        onPress: () =>
          setUploadTarget({
            sectionContentId: id,
            sectionTitle: title,
            autoPickSource: "library",
          }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  const handleCompleteSession = useCallback(() => {
    if (next) router.push(next.path as any);
    else router.back();
  }, [next, router]);

  if (isLoading && !workspace)
    return (
      <View className="flex-1 items-center justify-center bg-app">
        <ActivityIndicator color={colors.accent} />
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={() => load(true)}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-4">
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <Feather name="chevron-left" size={24} color="white" />
            </Pressable>
            <View>
              <Text className="text-2xl font-clash font-bold text-white">
                {session?.title ?? "Training Session"}
              </Text>
              <Text className="text-xs font-outfit text-white/60 uppercase tracking-widest">
                {module?.title}
              </Text>
            </View>
          </View>

          <SessionExerciseBlock
            title="Warmup"
            items={warmupItems}
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            uploadsBySectionId={uploadsBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
            completionAnchorItemId={completionAnchorItemId}
            onCompleteSession={handleCompleteSession}
          />
          <SessionExerciseBlock
            title="Main Session"
            items={mainItems}
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            uploadsBySectionId={uploadsBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
            completionAnchorItemId={completionAnchorItemId}
            onCompleteSession={handleCompleteSession}
          />
          <SessionExerciseBlock
            title="Cooldown"
            items={cooldownItems}
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            uploadsBySectionId={uploadsBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
            completionAnchorItemId={completionAnchorItemId}
            onCompleteSession={handleCompleteSession}
          />
        </View>
      </ThemedScrollView>

      {uploadTarget && (
        <Modal visible animationType="slide">
          <SafeAreaView className="flex-1 bg-app">
            <View className="flex-row justify-between p-4 items-center">
              <Text className="text-lg font-clash font-bold text-white">
                Upload Video
              </Text>
              <Pressable
                onPress={() => {
                  setUploadTarget(null);
                  load(true);
                }}
              >
                <Feather name="x" size={24} color="white" />
              </Pressable>
            </View>
            <VideoUploadPanel
              {...uploadTarget}
              onUploaded={() => {
                const sectionContentId = uploadTarget.sectionContentId;
                setUploadTarget(null);
                loadUploadsForSection(sectionContentId, true);
                load(true);
              }}
            />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

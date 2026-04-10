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
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { VideoUploadPanel } from "@/components/programs/ProgramPanels";
import { ProgramId } from "@/constants/program-details";

import { useSessionData } from "@/hooks/programs/useSessionData";
import { useSessionNavigation } from "@/hooks/programs/useSessionNavigation";
import { useSessionUploads } from "@/hooks/programs/useSessionUploads";
import { SessionExerciseBlock } from "@/components/programs/SessionExerciseBlock";

export default function ProgramSessionDetailScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { sessionId, programId, moduleId } = useLocalSearchParams<{ sessionId: string; programId: ProgramId; moduleId: string }>();
  const { token, programTier, athleteUserId, managedAthletes } = useAppSelector((state) => state.user);

  const activeAge = useMemo(() => {
    const selected = managedAthletes.find(a => a.id === athleteUserId || a.userId === athleteUserId) ?? managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const { workspace, isLoading, load, findModuleAndSession } = useSessionData(token, activeAge);
  const { module, session } = findModuleAndSession(Number(sessionId), Number(moduleId));
  const next = useSessionNavigation(workspace, module, session, programId as ProgramId);
  const { hasUploadedBySectionId, loadUploadsForSection } = useSessionUploads(token, athleteUserId);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<any>(null);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!session?.items) return;
    session.items.filter(i => i.allowVideoUpload).forEach(i => loadUploadsForSection(i.id));
  }, [session, loadUploadsForSection]);

  const handleUploadPress = (id: number, title: string) => {
    Alert.alert("Video Upload", "Choose an action", [
      { text: "Record", onPress: () => setUploadTarget({ sectionContentId: id, sectionTitle: title, autoPickSource: "camera" }) },
      { text: "Library", onPress: () => setUploadTarget({ sectionContentId: id, sectionTitle: title, autoPickSource: "library" }) },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  if (isLoading && !workspace) return <View className="flex-1 items-center justify-center bg-app"><ActivityIndicator color={colors.accent} /></View>;

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView onRefresh={() => load(true)} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-4">
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Feather name="chevron-left" size={24} color="white" />
            </Pressable>
            <View>
              <Text className="text-2xl font-clash font-bold text-white">{session?.title ?? "Training Session"}</Text>
              <Text className="text-xs font-outfit text-white/60 uppercase tracking-widest">{module?.title}</Text>
            </View>
          </View>

          <SessionExerciseBlock 
            title="Warmup" 
            items={session?.items.filter(i => i.blockType === "warmup") ?? []} 
            onVideoPress={setVideoUrl} 
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
          />
          <SessionExerciseBlock 
            title="Main Session" 
            items={session?.items.filter(i => i.blockType === "main") ?? []} 
            onVideoPress={setVideoUrl} 
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
          />
          <SessionExerciseBlock 
            title="Cooldown" 
            items={session?.items.filter(i => i.blockType === "cooldown") ?? []} 
            onVideoPress={setVideoUrl} 
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
          />

          {next && (
            <Pressable onPress={() => router.push(next.path as any)} className="bg-accent py-4 rounded-full items-center mt-4">
              <Text className="text-white font-outfit-bold uppercase">{next.label}</Text>
            </Pressable>
          )}
        </View>
      </ThemedScrollView>

      {videoUrl && (
        <View className="absolute inset-0 bg-black/90 items-center justify-center p-6">
          <VideoPlayer uri={videoUrl} height={300} />
          <Pressable onPress={() => setVideoUrl(null)} className="mt-6 bg-white/10 px-6 py-2 rounded-full">
            <Text className="text-white font-outfit">Close</Text>
          </Pressable>
        </View>
      )}

      {uploadTarget && (
        <Modal visible animationType="slide">
          <SafeAreaView className="flex-1 bg-app">
            <View className="flex-row justify-between p-4 items-center">
              <Text className="text-lg font-clash font-bold text-white">Upload Video</Text>
              <Pressable onPress={() => { setUploadTarget(null); load(true); }}><Feather name="x" size={24} color="white" /></Pressable>
            </View>
            <VideoUploadPanel {...uploadTarget} onUploaded={() => { setUploadTarget(null); load(true); }} />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

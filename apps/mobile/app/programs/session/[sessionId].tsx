import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier } from "@/lib/planAccess";
import { ProgramId } from "@/constants/program-details";

import { useSessionData } from "@/hooks/programs/useSessionData";
import { useSessionUploads } from "@/hooks/programs/useSessionUploads";
import { SessionExerciseBlock } from "@/components/programs/SessionExerciseBlock";
import { useVideoUploadLogic } from "@/hooks/programs/useVideoUploadLogic";
import {
  finishTrainingContentV2Session,
  FinishTrainingSessionWorkoutLog,
} from "@/services/programs/programsService";
import { radius, spacing, fonts } from "@/constants/theme";
import type { SelectedVideo } from "@/types/video-upload";

const VIDEO_MAX_MB = 200;
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;

type PendingSessionVideo = {
  video: SelectedVideo;
  notes: string;
  progress: number | null;
  error: string | null;
};

export default function ProgramSessionDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { sessionId, programId, moduleId, backToModule } = useLocalSearchParams<{
    sessionId: string;
    programId: ProgramId;
    moduleId: string;
    backToModule?: string;
  }>();
  const { token, programTier, athleteUserId, managedAthletes } = useAppSelector(
    (state) => state.user,
  );

  const activeAthlete = useMemo(() => {
    return (
      managedAthletes.find(
        (a) => a.id === athleteUserId || a.userId === athleteUserId,
      ) ?? managedAthletes[0] ?? null
    );
  }, [managedAthletes, athleteUserId]);
  const activeAge = activeAthlete?.age ?? null;

  const { workspace, isLoading, load, findModuleAndSession } = useSessionData(
    token,
    activeAge,
  );
  const { module, session } = findModuleAndSession(
    Number(sessionId),
    Number(moduleId),
  );
  const { uploadsBySectionId, hasUploadedBySectionId, loadUploadsForSection } =
    useSessionUploads(token, athleteUserId);
  const {
    uploadVideo,
    isUploading,
    status: uploadStatus,
    setStatus: setUploadStatus,
  } = useVideoUploadLogic(token, athleteUserId);

  const [workoutSheetOpen, setWorkoutSheetOpen] = useState(false);
  const [weightsUsed, setWeightsUsed] = useState("");
  const [repsCompleted, setRepsCompleted] = useState("");
  const [rpeText, setRpeText] = useState("");
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const [pendingBySectionId, setPendingBySectionId] = useState<
    Record<number, PendingSessionVideo | undefined>
  >({});
  const [activeUploadSectionId, setActiveUploadSectionId] = useState<
    number | null
  >(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session?.items) return;
    session.items
      .filter((i) => i.allowVideoUpload)
      .forEach((i) => loadUploadsForSection(i.id));
  }, [session, loadUploadsForSection]);

  const pickVideo = useCallback(async (source: "library" | "camera") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) return null;

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.9,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.9,
          });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    const sizeBytes = fileInfo.exists ? fileInfo.size : 0;

    if (fileInfo.exists && sizeBytes > VIDEO_MAX_BYTES) {
      throw new Error(`Video exceeds ${VIDEO_MAX_MB}MB limit.`);
    }

    return {
      uri: asset.uri,
      fileName: asset.uri.split("/").pop() ?? "video.mp4",
      contentType: asset.mimeType || "video/mp4",
      sizeBytes,
    } satisfies SelectedVideo;
  }, []);

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

  const isAdult = (activeAge ?? 0) >= 18;
  const sessionIdNum = Number(sessionId);
  const moduleIdNum = Number(moduleId);

  const moduleHref = useMemo(() => {
    if (!moduleId) return "/(tabs)/programs";
    return `/programs/module/${encodeURIComponent(String(moduleId))}?programId=${encodeURIComponent(String(programId))}`;
  }, [moduleId, programId]);

  const shouldBackToModule =
    backToModule === "1" || backToModule === "true";

  const computeNextPath = useCallback(
    (ws: any) => {
      const modules = Array.isArray(ws?.modules) ? (ws.modules as any[]) : [];
      if (!modules.length) return null;

      const sortedModules = [...modules].sort(
        (a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0),
      );

      const effectiveModule =
        Number.isFinite(moduleIdNum) && moduleIdNum > 0
          ? sortedModules.find((m) => m.id === moduleIdNum)
          : sortedModules.find((m) =>
              (m.sessions ?? []).some((s: any) => s.id === sessionIdNum),
            );
      if (!effectiveModule) return null;

      const mIdx = sortedModules.findIndex((m) => m.id === effectiveModule.id);
      if (mIdx < 0) return null;

      const sortedSessions = [...(effectiveModule.sessions ?? [])].sort(
        (a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0),
      );
      const sIdx = sortedSessions.findIndex((s: any) => s.id === sessionIdNum);

      if (sIdx >= 0 && sIdx < sortedSessions.length - 1) {
        const nextSession = sortedSessions[sIdx + 1];
        if (nextSession && !nextSession.locked) {
          return `/programs/session/${nextSession.id}?programId=${programId}&moduleId=${effectiveModule.id}`;
        }
      }

      for (let i = mIdx + 1; i < sortedModules.length; i++) {
        const nextM = sortedModules[i];
        if (!nextM || nextM.locked) continue;
        return `/programs/module/${nextM.id}?programId=${programId}`;
      }

      return null;
    },
    [moduleIdNum, programId, sessionIdNum],
  );

  const computePreviousPath = useCallback(
    (ws: any) => {
      const modules = Array.isArray(ws?.modules) ? (ws.modules as any[]) : [];
      if (!modules.length) return null;

      const sortedModules = [...modules].sort(
        (a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0),
      );

      const effectiveModule =
        Number.isFinite(moduleIdNum) && moduleIdNum > 0
          ? sortedModules.find((m) => m.id === moduleIdNum)
          : sortedModules.find((m) =>
              (m.sessions ?? []).some((s: any) => s.id === sessionIdNum),
            );
      if (!effectiveModule) return null;

      const mIdx = sortedModules.findIndex((m) => m.id === effectiveModule.id);
      if (mIdx < 0) return null;

      const sortedSessions = [...(effectiveModule.sessions ?? [])].sort(
        (a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0),
      );
      const sIdx = sortedSessions.findIndex((s: any) => s.id === sessionIdNum);

      if (sIdx > 0) {
        for (let i = sIdx - 1; i >= 0; i--) {
          const prevSession = sortedSessions[i];
          if (prevSession && !prevSession.locked) {
            return `/programs/session/${prevSession.id}?programId=${programId}&moduleId=${effectiveModule.id}`;
          }
        }
      }

      for (let i = mIdx - 1; i >= 0; i--) {
        const prevModule = sortedModules[i];
        if (!prevModule || prevModule.locked) continue;
        const prevSessions = [...(prevModule.sessions ?? [])].sort(
          (a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0),
        );
        for (let j = prevSessions.length - 1; j >= 0; j--) {
          const candidate = prevSessions[j];
          if (candidate && !candidate.locked) {
            return `/programs/session/${candidate.id}?programId=${programId}&moduleId=${prevModule.id}`;
          }
        }
        return `/programs/module/${prevModule.id}?programId=${programId}`;
      }

      return `/programs/module/${effectiveModule.id}?programId=${programId}`;
    },
    [moduleIdNum, programId, sessionIdNum],
  );

  const handleHeaderBack = useCallback(() => {
    if (shouldBackToModule) {
      router.replace(moduleHref as any);
      return;
    }
    const path = computePreviousPath(workspace);
    if (path) {
      router.replace(path as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/programs");
  }, [computePreviousPath, moduleHref, router, shouldBackToModule, workspace]);

  useFocusEffect(
    useCallback(() => {
      if (!shouldBackToModule) return;
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace(moduleHref as any);
        return true;
      });
      return () => sub.remove();
    }, [moduleHref, router, shouldBackToModule]),
  );

  const handleUploadPress = useCallback((id: number, _title: string) => {
    Alert.alert("Video Upload", "Choose an action", [
      {
        text: "Record",
        onPress: () => {
          void (async () => {
            try {
              setUploadStatus(null);
              const selected = await pickVideo("camera");
              if (!selected) return;
              setPendingBySectionId((prev) => ({
                ...prev,
                [id]: { video: selected, notes: "", progress: null, error: null },
              }));
            } catch (e) {
              const message =
                e instanceof Error ? e.message : "Failed to pick video.";
              Alert.alert("Couldn't pick video", message);
            }
          })();
        },
      },
      {
        text: "Library",
        onPress: () => {
          void (async () => {
            try {
              setUploadStatus(null);
              const selected = await pickVideo("library");
              if (!selected) return;
              setPendingBySectionId((prev) => ({
                ...prev,
                [id]: { video: selected, notes: "", progress: null, error: null },
              }));
            } catch (e) {
              const message =
                e instanceof Error ? e.message : "Failed to pick video.";
              Alert.alert("Couldn't pick video", message);
            }
          })();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickVideo, setUploadStatus]);

  const handlePendingRemove = useCallback(
    (sectionContentId: number) => {
      if (activeUploadSectionId === sectionContentId && isUploading) return;
      setPendingBySectionId((prev) => {
        const next = { ...prev };
        delete next[sectionContentId];
        return next;
      });
    },
    [activeUploadSectionId, isUploading],
  );

  const handlePendingNotesChange = useCallback(
    (sectionContentId: number, notes: string) => {
      setPendingBySectionId((prev) => {
        const current = prev[sectionContentId];
        if (!current) return prev;
        return { ...prev, [sectionContentId]: { ...current, notes } };
      });
    },
    [],
  );

  const handlePendingSend = useCallback(
    async (sectionContentId: number) => {
      const pending = pendingBySectionId[sectionContentId];
      if (!pending) return;
      if (isUploading) return;

      setActiveUploadSectionId(sectionContentId);
      setPendingBySectionId((prev) => ({
        ...prev,
        [sectionContentId]: { ...pending, progress: 0, error: null },
      }));

      try {
        await uploadVideo({
          video: pending.video,
          notes: pending.notes.trim() || undefined,
          sectionContentId,
          onProgress: (p) => {
            setPendingBySectionId((prev) => {
              const current = prev[sectionContentId];
              if (!current) return prev;
              return { ...prev, [sectionContentId]: { ...current, progress: p } };
            });
          },
        });

        setPendingBySectionId((prev) => {
          const next = { ...prev };
          delete next[sectionContentId];
          return next;
        });

        await Promise.all([
          loadUploadsForSection(sectionContentId, true),
          load(true),
        ]);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to upload video.";
        setPendingBySectionId((prev) => {
          const current = prev[sectionContentId];
          if (!current) return prev;
          return {
            ...prev,
            [sectionContentId]: { ...current, error: message, progress: null },
          };
        });
        Alert.alert("Couldn't upload", message);
      } finally {
        setActiveUploadSectionId(null);
      }
    },
    [isUploading, load, loadUploadsForSection, pendingBySectionId, uploadVideo],
  );

  const finishAndNavigate = useCallback(
    async (workoutLog: FinishTrainingSessionWorkoutLog | null) => {
      if (!token) {
        setFinishError("Not signed in.");
        return;
      }
      if (!Number.isFinite(sessionIdNum) || sessionIdNum <= 0) {
        setFinishError("Invalid session.");
        return;
      }

      setIsFinishing(true);
      setFinishError(null);
      try {
        await finishTrainingContentV2Session(token, sessionIdNum, workoutLog);
        const updated = await load(true);
        const path = computeNextPath(updated);
        setWorkoutSheetOpen(false);
        if (path) {
          const separator = path.includes("?") ? "&" : "?";
          router.replace(`${path}${separator}backToModule=1` as any);
        } else {
          router.replace(moduleHref as any);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to complete session.";
        setFinishError(message);
        throw e;
      } finally {
        setIsFinishing(false);
      }
    },
    [computeNextPath, load, moduleHref, router, sessionIdNum, token],
  );

  const handleCompleteSession = useCallback(async () => {
    if (isFinishing) return;

    if (isAdult) {
      setWeightsUsed("");
      setRepsCompleted("");
      setRpeText("");
      setFinishError(null);
      setWorkoutSheetOpen(true);
      return;
    }

    try {
      await finishAndNavigate(null);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to complete session.";
      Alert.alert("Couldn't complete", message);
    }
  }, [finishAndNavigate, isAdult, isFinishing]);

  if (isLoading && !workspace)
    return (
      <View className="flex-1 items-center justify-center bg-app">
        <ActivityIndicator color={colors.accent} />
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={() => {
          void load(true);
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-4">
          <View
            className="mb-6 rounded-[30px] border px-5 py-5"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={handleHeaderBack}
                className="h-11 w-11 items-center justify-center rounded-[18px]"
                style={{ backgroundColor: colors.surfaceHigh }}
              >
                <Feather name="arrow-left" size={20} color={colors.accent} />
              </Pressable>
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: colors.accentLight }}
              >
                <Text
                  className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]"
                  style={{ color: colors.accent }}
                >
                  Session detail
                </Text>
              </View>
            </View>

            <Text
              className="mt-4 text-[26px] font-telma-bold font-bold"
              style={{ color: colors.textPrimary }}
            >
              {session?.title ?? "Training Session"}
            </Text>
            {module?.title ? (
              <Text
                className="mt-1 text-xs font-outfit uppercase tracking-widest"
                style={{ color: colors.textSecondary }}
              >
                {module.title}
              </Text>
            ) : null}

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: colors.surfaceHigh }}
              >
                <Text
                  className="text-[11px] font-outfit font-semibold"
                  style={{ color: colors.text }}
                >
                  Warmup: {warmupItems.length}
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: colors.surfaceHigh }}
              >
                <Text
                  className="text-[11px] font-outfit font-semibold"
                  style={{ color: colors.text }}
                >
                  Main: {mainItems.length}
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: colors.surfaceHigh }}
              >
                <Text
                  className="text-[11px] font-outfit font-semibold"
                  style={{ color: colors.text }}
                >
                  Cooldown: {cooldownItems.length}
                </Text>
              </View>
            </View>
          </View>

          <SessionExerciseBlock
            title="Warmup"
            items={warmupItems}
            onUploadPress={handleUploadPress}
            hasUploaded={hasUploadedBySectionId}
            uploadsBySectionId={uploadsBySectionId}
            canUpload={canAccessTier(programTier, "PHP_Premium")}
            pendingBySectionId={pendingBySectionId}
            activeUploadSectionId={activeUploadSectionId}
            isUploading={isUploading}
            uploadStatus={uploadStatus}
            onPendingRemove={handlePendingRemove}
            onPendingNotesChange={handlePendingNotesChange}
            onPendingSend={handlePendingSend}
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
            pendingBySectionId={pendingBySectionId}
            activeUploadSectionId={activeUploadSectionId}
            isUploading={isUploading}
            uploadStatus={uploadStatus}
            onPendingRemove={handlePendingRemove}
            onPendingNotesChange={handlePendingNotesChange}
            onPendingSend={handlePendingSend}
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
            pendingBySectionId={pendingBySectionId}
            activeUploadSectionId={activeUploadSectionId}
            isUploading={isUploading}
            uploadStatus={uploadStatus}
            onPendingRemove={handlePendingRemove}
            onPendingNotesChange={handlePendingNotesChange}
            onPendingSend={handlePendingSend}
            completionAnchorItemId={completionAnchorItemId}
            onCompleteSession={handleCompleteSession}
          />
        </View>
      </ThemedScrollView>

      <Modal
        visible={workoutSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isFinishing) setWorkoutSheetOpen(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xxl,
                borderTopRightRadius: radius.xxl,
                borderColor: colors.borderSubtle,
                borderWidth: 1,
                maxHeight: "85%",
                paddingTop: spacing.xl,
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.xl + insets.bottom,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  style={{
                    fontFamily: fonts.heading1,
                    fontSize: 20,
                    color: colors.textPrimary,
                  }}
                >
                  Log workout (optional)
                </Text>
                <Pressable
                  onPress={() => setWorkoutSheetOpen(false)}
                  disabled={isFinishing}
                  className="h-10 w-10 items-center justify-center rounded-full"
                >
                  <Feather name="x" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Totally optional — you can complete without logging.
                </Text>

                <View style={{ marginTop: spacing.lg, gap: 10 }}>
                  <View>
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 14,
                        color: colors.textPrimary,
                      }}
                    >
                      Weights used
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <TextInput
                        value={weightsUsed}
                        onChangeText={setWeightsUsed}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 14,
                          color: colors.textPrimary,
                          minHeight: 60,
                          textAlignVertical: "top",
                        }}
                        editable={!isFinishing}
                      />
                    </View>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 14,
                        color: colors.textPrimary,
                      }}
                    >
                      Reps completed
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <TextInput
                        value={repsCompleted}
                        onChangeText={setRepsCompleted}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 14,
                          color: colors.textPrimary,
                          minHeight: 60,
                          textAlignVertical: "top",
                        }}
                        editable={!isFinishing}
                      />
                    </View>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 14,
                        color: colors.textPrimary,
                      }}
                    >
                      RPE (1–10)
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <TextInput
                        value={rpeText}
                        onChangeText={setRpeText}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 14,
                          color: colors.textPrimary,
                        }}
                        editable={!isFinishing}
                      />
                    </View>
                  </View>
                </View>

                {finishError ? (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 13,
                        color: colors.coral,
                      }}
                    >
                      {finishError}
                    </Text>
                  </View>
                ) : null}

                <View style={{ marginTop: spacing.xl, gap: 10 }}>
                  <Pressable
                    disabled={isFinishing}
                    onPress={async () => {
                      const w = weightsUsed.trim();
                      const r = repsCompleted.trim();
                      const rpeTrimmed = rpeText.trim();
                      const rpeNum = rpeTrimmed
                        ? Number.parseInt(rpeTrimmed, 10)
                        : null;
                      if (
                        rpeTrimmed &&
                        (!Number.isFinite(rpeNum) || Number.isNaN(rpeNum))
                      ) {
                        setFinishError("RPE must be a number 1–10.");
                        return;
                      }

                      const payload: FinishTrainingSessionWorkoutLog = {};
                      if (w) payload.weightsUsed = w;
                      if (r) payload.repsCompleted = r;
                      if (rpeTrimmed && rpeNum != null) payload.rpe = rpeNum;

                      try {
                        await finishAndNavigate(
                          Object.keys(payload).length ? payload : null,
                        );
                      } catch {
                        // keep sheet open; error shown above
                      }
                    }}
                    style={{
                      height: 54,
                      borderRadius: radius.xl,
                      backgroundColor: colors.accent,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    {isFinishing ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : null}
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 16,
                        color: colors.textInverse,
                      }}
                    >
                      Save & Complete
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={isFinishing}
                    onPress={async () => {
                      try {
                        await finishAndNavigate(null);
                      } catch {
                        // keep sheet open; error shown above
                      }
                    }}
                    style={{
                      height: 54,
                      borderRadius: radius.xl,
                      backgroundColor: "transparent",
                      borderColor: colors.borderSubtle,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 16,
                        color: colors.textSecondary,
                      }}
                    >
                      Complete without logging
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={isFinishing}
                    onPress={() => setWorkoutSheetOpen(false)}
                    style={{
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.heading3,
                        fontSize: 15,
                        color: colors.textSecondary,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

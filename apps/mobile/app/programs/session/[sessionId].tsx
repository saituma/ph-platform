import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { scheduleLocalNotification } from "@/lib/localNotifications";
import { isAdultAthleteAppRole } from "@/lib/appRole";
import { ProgramId } from "@/constants/program-details";

import { useSessionData } from "@/hooks/programs/useSessionData";
import { useSessionUploads } from "@/hooks/programs/useSessionUploads";
import { SessionExerciseBlock } from "@/components/programs/SessionExerciseBlock";
import { useVideoUploadLogic } from "@/hooks/programs/useVideoUploadLogic";
import { useVideoHistory } from "@/hooks/programs/useVideoHistory";
import { BuiltinCamera } from "@/components/media/BuiltinCamera";
import {
  finishTrainingContentV2Session,
  FinishTrainingSessionWorkoutLog,
} from "@/services/programs/programsService";
import { radius, spacing, fonts } from "@/constants/theme";
import type { SelectedVideo } from "@/types/video-upload";

const VIDEO_MAX_MB = 90;
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;
const VIDEO_MAX_DURATION_SECONDS = 60;

type PendingSessionVideo = {
  video: SelectedVideo;
  notes: string;
  progress: number | null;
  error: string | null;
};

export default function ProgramSessionDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { sessionId, programId, moduleId, backToModule } =
    useLocalSearchParams<{
      sessionId: string;
      programId?: ProgramId;
      moduleId: string;
      backToModule?: string;
    }>();
  const { token, athleteUserId, managedAthletes, appRole, capabilities } =
    useAppSelector((state) => state.user);

  /**
   * Cold start protection: ghost restore guard — see content/[contentId].tsx for rationale.
   */
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (router.canGoBack()) return;
      Linking.getInitialURL().then((url) => {
        if (cancelled) return;
        if (url && url.includes("/programs/session/")) return;
        router.replace("/(tabs)");
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canUploadVideoResponse = Boolean(capabilities?.coachVideoUpload);

  const activeAthlete = useMemo(() => {
    return (
      managedAthletes.find(
        (a) => a.id === athleteUserId || a.userId === athleteUserId,
      ) ??
      managedAthletes[0] ??
      null
    );
  }, [managedAthletes, athleteUserId]);
  const activeAge = activeAthlete?.age ?? null;

  const { workspace, isLoading, error: workspaceError, load, findModuleAndSession } = useSessionData(
    token,
    activeAge,
  );
  const { module, session } = findModuleAndSession(
    Number(sessionId),
    Number(moduleId),
  );
  const { uploadsBySectionId, hasUploadedBySectionId, loadUploadsForSection } =
    useSessionUploads(token, athleteUserId);
  const { coachResponses, loadCoachResponses } = useVideoHistory(
    token,
    athleteUserId,
    null,
  );
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
  const [builtinCameraVisible, setBuiltinCameraVisible] = useState(false);
  const [builtinCameraTargetSectionId, setBuiltinCameraTargetSectionId] =
    useState<number | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session?.items) return;
    session.items
      .filter((i) => i.allowVideoUpload)
      .forEach((i) => loadUploadsForSection(i.id));
  }, [session, loadUploadsForSection]);

  useFocusEffect(
    useCallback(() => {
      loadCoachResponses(true);
    }, [loadCoachResponses]),
  );

  const coachResponsesByUploadId = useMemo(() => {
    const map = new Map<string, any[]>();
    coachResponses.forEach((res) => {
      const key = String(res.videoUploadId);
      const existing = map.get(key) ?? [];
      existing.push(res);
      map.set(key, existing);
    });
    return map;
  }, [coachResponses]);

  const pickVideo = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) return null;

    const iosCompressionOptions =
      Platform.OS === "ios"
        ? {
            // Force H.264 transcode to a smaller target profile where possible.
            videoExportPreset: ImagePicker.VideoExportPreset.H264_960x540,
            videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
            preferredAssetRepresentationMode:
              ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
          }
        : {};

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "videos",
      quality: 0.5,
      ...iosCompressionOptions,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const durationSeconds =
      typeof asset.duration === "number" && Number.isFinite(asset.duration)
        ? Math.round(asset.duration / 1000)
        : null;
    if (durationSeconds != null && durationSeconds > VIDEO_MAX_DURATION_SECONDS) {
      throw new Error(
        `Video is ${durationSeconds}s. Please keep clips at ${VIDEO_MAX_DURATION_SECONDS}s or less.`,
      );
    }
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    const sizeBytes = fileInfo.exists ? fileInfo.size : 0;

    if (fileInfo.exists && sizeBytes > VIDEO_MAX_BYTES) {
      throw new Error(
        `Video exceeds ${VIDEO_MAX_MB}MB limit. Keep it under ${VIDEO_MAX_DURATION_SECONDS}s or pick a shorter clip.`,
      );
    }

    return {
      uri: asset.uri,
      fileName: asset.uri.split("/").pop() ?? "video.mp4",
      contentType: asset.mimeType || "video/mp4",
      sizeBytes,
    } satisfies SelectedVideo;
  }, []);

  const handleBuiltinCameraRecorded = useCallback(
    async (asset: { uri: string; duration: number; width: number; height: number }) => {
      setBuiltinCameraVisible(false);
      const targetId = builtinCameraTargetSectionId;
      setBuiltinCameraTargetSectionId(null);
      if (!targetId) return;

      try {
        if (
          Number.isFinite(asset.duration) &&
          asset.duration > VIDEO_MAX_DURATION_SECONDS
        ) {
          throw new Error(
            `Video is ${asset.duration}s. Please keep clips at ${VIDEO_MAX_DURATION_SECONDS}s or less.`,
          );
        }

        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const sizeBytes = fileInfo.exists ? fileInfo.size : 0;
        if (fileInfo.exists && sizeBytes > VIDEO_MAX_BYTES) {
          throw new Error(
            `Video exceeds ${VIDEO_MAX_MB}MB limit. Keep it under ${VIDEO_MAX_DURATION_SECONDS}s or pick a shorter clip.`,
          );
        }

        const uriLower = asset.uri.toLowerCase();
        const contentType = uriLower.endsWith(".mov")
          ? "video/quicktime"
          : "video/mp4";
        setPendingBySectionId((prev) => ({
          ...prev,
          [targetId]: {
            video: {
              uri: asset.uri,
              fileName: asset.uri.split("/").pop() ?? "video.mp4",
              contentType,
              sizeBytes,
              width: asset.width,
              height: asset.height,
            },
            notes: "",
            progress: null,
            error: null,
          },
        }));
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to record video.";
        Alert.alert("Couldn't use recording", message);
      }
    },
    [builtinCameraTargetSectionId],
  );

  const warmupItems = useMemo(
    () => session?.items?.filter((i) => i.blockType === "warmup") ?? [],
    [session],
  );
  const mainItems = useMemo(
    () => session?.items?.filter((i) => i.blockType === "main") ?? [],
    [session],
  );
  const cooldownItems = useMemo(
    () => session?.items?.filter((i) => i.blockType === "cooldown") ?? [],
    [session],
  );

  const completionAnchorItemId = useMemo(() => {
    const lastCooldown = cooldownItems[cooldownItems.length - 1];
    const lastMain = mainItems[mainItems.length - 1];
    const lastWarmup = warmupItems[warmupItems.length - 1];
    return (lastCooldown ?? lastMain ?? lastWarmup)?.id;
  }, [cooldownItems, mainItems, warmupItems]);

  const needsWorkoutLogSheet = isAdultAthleteAppRole(appRole);
  const sessionIdNum = Number(sessionId);
  const moduleIdNum = Number(moduleId);

  const moduleHref = useMemo(() => {
    if (!moduleId) return "/(tabs)/programs";
    const pid = programId ? `?programId=${encodeURIComponent(String(programId))}` : "";
    return `/programs/module/${encodeURIComponent(String(moduleId))}${pid}`;
  }, [moduleId, programId]);

  const shouldBackToModule = backToModule === "1" || backToModule === "true";

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

      const pidParam = programId ? `&programId=${encodeURIComponent(String(programId))}` : "";
      const pidQuery = programId ? `?programId=${encodeURIComponent(String(programId))}` : "";

      if (sIdx >= 0 && sIdx < sortedSessions.length - 1) {
        const nextSession = sortedSessions[sIdx + 1];
        if (nextSession && !nextSession.locked) {
          return `/programs/session/${nextSession.id}?moduleId=${effectiveModule.id}${pidParam}`;
        }
      }

      for (let i = mIdx + 1; i < sortedModules.length; i++) {
        const nextM = sortedModules[i];
        if (!nextM || nextM.locked) continue;
        return `/programs/module/${nextM.id}${pidQuery}`;
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

      const pidParam = programId ? `&programId=${encodeURIComponent(String(programId))}` : "";
      const pidQuery = programId ? `?programId=${encodeURIComponent(String(programId))}` : "";

      if (sIdx > 0) {
        for (let i = sIdx - 1; i >= 0; i--) {
          const prevSession = sortedSessions[i];
          if (prevSession && !prevSession.locked) {
            return `/programs/session/${prevSession.id}?moduleId=${effectiveModule.id}${pidParam}`;
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
            return `/programs/session/${candidate.id}?moduleId=${prevModule.id}${pidParam}`;
          }
        }
        return `/programs/module/${prevModule.id}${pidQuery}`;
      }

      return `/programs/module/${effectiveModule.id}${pidQuery}`;
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

  const handleUploadPress = useCallback(
    (id: number, _title: string) => {
      Alert.alert("Video Upload", "Choose an action", [
        {
          text: "Record",
          onPress: () => {
            setUploadStatus(null);
            setBuiltinCameraTargetSectionId(id);
            // Avoid Android FragmentManager transaction races after Alert dismissal.
            InteractionManager.runAfterInteractions(() => {
              setTimeout(() => setBuiltinCameraVisible(true), 80);
            });
          },
        },
        {
          text: "Library",
          onPress: () => {
            void (async () => {
              try {
                setUploadStatus(null);
                const selected = await pickVideo();
                if (!selected) return;
                setPendingBySectionId((prev) => ({
                  ...prev,
                  [id]: {
                    video: selected,
                    notes: "",
                    progress: null,
                    error: null,
                  },
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
    },
    [pickVideo, setUploadStatus],
  );

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
              return {
                ...prev,
                [sectionContentId]: { ...current, progress: p },
              };
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
        const sessionTitle = session?.title ?? "Your session";
        const hasWorkoutLog =
          !!workoutLog &&
          Boolean(
            (workoutLog.weightsUsed && workoutLog.weightsUsed.trim()) ||
              (workoutLog.repsCompleted && workoutLog.repsCompleted.trim()) ||
              (workoutLog.rpe != null &&
                Number.isFinite(workoutLog.rpe) &&
                workoutLog.rpe > 0),
          );
        const nextPath = computeNextPath(updated);
        const unlockHint = nextPath
          ? " Next workout or module is unlocked."
          : "";
        await scheduleLocalNotification({
          title: hasWorkoutLog ? "Workout logged" : "Session completed",
          body: hasWorkoutLog
            ? `Your log for ${sessionTitle} was saved.${unlockHint}`
            : `${sessionTitle} is marked complete.${unlockHint}`,
          data: {
            type: hasWorkoutLog ? "workout-log-saved" : "session-complete",
            screen: "programs",
            sessionId: String(sessionIdNum),
          },
          channelId: "progress",
        });
        const path = nextPath;
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
    [computeNextPath, load, moduleHref, router, session?.title, sessionIdNum, token],
  );

  const handleCompleteSession = useCallback(async () => {
    if (isFinishing) return;

    if (needsWorkoutLogSheet) {
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
  }, [finishAndNavigate, needsWorkoutLogSheet, isFinishing]);

  if (isLoading && !workspace)
    return (
      <View className="flex-1 items-center justify-center bg-app">
        <ActivityIndicator color={colors.accent} />
      </View>
    );

  if (!isLoading && !workspace && workspaceError)
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="text-sm font-outfit text-secondary text-center">
            {workspaceError}
          </Text>
          <Pressable
            onPress={() => void load(true)}
            className="rounded-2xl px-6 py-3"
            style={{ backgroundColor: colors.accent }}
          >
            <Text className="text-sm font-outfit font-semibold" style={{ color: colors.textInverse }}>
              Retry
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
            coachResponsesByUploadId={coachResponsesByUploadId}
            canUpload={canUploadVideoResponse}
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
            coachResponsesByUploadId={coachResponsesByUploadId}
            canUpload={canUploadVideoResponse}
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
            coachResponsesByUploadId={coachResponsesByUploadId}
            canUpload={canUploadVideoResponse}
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
                  Workout log
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
                  Log weights, reps, and RPE if you like, then mark the session
                  complete. You can also finish without logging.
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
                      if (rpeTrimmed) {
                        if (
                          rpeNum == null ||
                          !Number.isFinite(rpeNum) ||
                          Number.isNaN(rpeNum) ||
                          rpeNum < 1 ||
                          rpeNum > 10
                        ) {
                          setFinishError("RPE must be a whole number from 1 to 10.");
                          return;
                        }
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
      <BuiltinCamera
        visible={builtinCameraVisible}
        onCancel={() => {
          setBuiltinCameraVisible(false);
          setBuiltinCameraTargetSectionId(null);
        }}
        onRecorded={(asset) => {
          void handleBuiltinCameraRecorded(asset);
        }}
      />
    </SafeAreaView>
  );
}

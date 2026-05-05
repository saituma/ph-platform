import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { Card } from "heroui-native";
import { BuiltinCamera } from "@/components/media/BuiltinCamera";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import {
  useMySessionExercises,
  useCompleteSession,
  type SessionExercise,
} from "@/hooks/programs/useMyPrograms";
import { useVideoUploadLogic } from "@/hooks/programs/useVideoUploadLogic";
import { Shadows, radius, spacing, fonts } from "@/constants/theme";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import type { SelectedVideo } from "@/types/video-upload";

const VIDEO_MAX_MB = 90;
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;
const VIDEO_MAX_DURATION_SECONDS = 60;

type ExerciseUploadState = {
  progress: number | null;
  error: string | null;
  statusText: string | null;
};

export default function AssignedSessionDetailScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const {
    sessionId,
    title: titleParam,
    programId: programIdParam,
    moduleId: moduleIdParam,
  } = useLocalSearchParams<{
    sessionId: string;
    title?: string;
    programId?: string;
    moduleId?: string;
  }>();
  const token = useAppSelector((s) => s.user.token);
  const { colors, isDark } = useAppTheme();

  const sessionIdNum = useMemo(() => {
    const n = Number(sessionId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [sessionId]);

  const sessionTitle = titleParam ? decodeURIComponent(titleParam) : "Session";

  const athleteUserId = useAppSelector((s) => s.user.athleteUserId);
  const { exercises, isLoading, error, loadExercises } = useMySessionExercises(token);
  const { completeSession, isCompleting } = useCompleteSession(token);
  const {
    uploadVideo,
    isUploading,
    status: uploadStatus,
  } = useVideoUploadLogic(token, athleteUserId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [recorderVisible, setRecorderVisible] = useState(false);
  const [recordingExerciseId, setRecordingExerciseId] = useState<number | null>(null);
  const [recordingSectionContentId, setRecordingSectionContentId] = useState<number | null>(null);
  const [uploadStateByExId, setUploadStateByExId] = useState<
    Record<number, ExerciseUploadState | undefined>
  >({});

  const handleUploadSelectedVideo = useCallback(
    async (exerciseId: number, selected: SelectedVideo, sectionContentId?: number | null) => {
      if (isUploading) return;
      if (!sectionContentId || !Number.isFinite(sectionContentId) || sectionContentId <= 0) {
        Alert.alert("Upload unavailable", "This exercise is missing its training section id, so the video cannot be linked yet.");
        return;
      }

      try {
        setUploadStateByExId((prev) => ({
          ...prev,
          [exerciseId]: { progress: 0, error: null, statusText: "Preparing..." },
        }));

        await uploadVideo({
          video: selected,
          sectionContentId: sectionContentId ?? undefined,
          onProgress: (ratio) => {
            setUploadStateByExId((prev) => ({
              ...prev,
              [exerciseId]: {
                progress: ratio,
                error: null,
                statusText: `Uploading ${Math.round(ratio * 100)}%...`,
              },
            }));
          },
        });

        setUploadStateByExId((prev) => ({
          ...prev,
          [exerciseId]: { progress: 1, error: null, statusText: "Uploaded!" },
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Clear success state after a short delay
        setTimeout(() => {
          setUploadStateByExId((prev) => {
            const next = { ...prev };
            delete next[exerciseId];
            return next;
          });
        }, 3000);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to upload video.";
        setUploadStateByExId((prev) => ({
          ...prev,
          [exerciseId]: { progress: null, error: message, statusText: null },
        }));
        Alert.alert("Upload failed", message);
      }
    },
    [isUploading, uploadVideo],
  );

  const handlePickAndUpload = useCallback(
    async (exerciseId: number, source: "camera" | "library", sectionContentId?: number | null) => {
      if (isUploading) return;
      if (source === "camera") {
        setRecordingExerciseId(exerciseId);
        setRecordingSectionContentId(sectionContentId ?? null);
        setRecorderVisible(true);
        return;
      }
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission needed", "Please allow access to your video library.");
          return;
        }
        const iosCompressionOptions =
          Platform.OS === "ios"
            ? {
                videoExportPreset: ImagePicker.VideoExportPreset.H264_960x540,
                videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
                preferredAssetRepresentationMode:
                  ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
              }
            : {};
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "videos",
          quality: 0.5,
          videoMaxDuration: VIDEO_MAX_DURATION_SECONDS,
          ...iosCompressionOptions,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const durationSeconds =
          typeof asset.duration === "number" && Number.isFinite(asset.duration)
            ? Math.round(asset.duration / 1000)
            : null;
        if (durationSeconds != null && durationSeconds > VIDEO_MAX_DURATION_SECONDS) {
          Alert.alert("Video too long", `Video is ${durationSeconds}s. Please keep clips at ${VIDEO_MAX_DURATION_SECONDS}s or less.`);
          return;
        }
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const sizeBytes = fileInfo.exists ? fileInfo.size : 0;
        if (fileInfo.exists && sizeBytes > VIDEO_MAX_BYTES) {
          Alert.alert("Video too large", `Video exceeds ${VIDEO_MAX_MB}MB limit. Pick a shorter clip.`);
          return;
        }
        await handleUploadSelectedVideo(exerciseId, {
          uri: asset.uri,
          fileName: asset.uri.split("/").pop() ?? "video.mp4",
          contentType: asset.mimeType || "video/mp4",
          sizeBytes,
          width: asset.width ?? undefined,
          height: asset.height ?? undefined,
        }, sectionContentId);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to pick video.";
        Alert.alert("Video picker failed", message);
      }
    },
    [handleUploadSelectedVideo, isUploading],
  );

  useEffect(() => {
    if (sessionIdNum) loadExercises(sessionIdNum);
  }, [sessionIdNum]);

  const handleRefresh = useCallback(async () => {
    if (!sessionIdNum) return;
    setIsRefreshing(true);
    await loadExercises(sessionIdNum, true);
    setIsRefreshing(false);
  }, [sessionIdNum, loadExercises]);

  const handleFinish = useCallback(async () => {
    if (!sessionIdNum) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await completeSession(sessionIdNum);
    if (!result) {
      Alert.alert("Error", "Could not complete session. Please try again.");
      return;
    }
    if (result.nextSession) {
      const label = result.nextSession.title || `Session ${result.nextSession.sessionNumber}`;
      router.replace(
        `/programs/assigned-session/${result.nextSession.id}?title=${encodeURIComponent(label)}&programId=${programIdParam ?? ""}&moduleId=${moduleIdParam ?? ""}` as any,
      );
    } else if (programIdParam && moduleIdParam) {
      Alert.alert("Module Complete", "You've finished all sessions in this module!", [
        { text: "Back to Module", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Session Complete", "Great work!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [sessionIdNum, completeSession, programIdParam, moduleIdParam, router]);

  const exerciseCount = exercises.length;
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.exercise.sets ?? 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? colors.borderSubtle : colors.borderSubtle,
        }}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/programs" as any))}
          hitSlop={8}
          style={({ pressed }) => ({
            height: 38,
            width: 38,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.sm,
            backgroundColor: isDark ? colors.surfaceHigh : colors.surfaceHigh,
            borderWidth: 1,
            borderColor: isDark ? colors.borderSubtle : colors.borderMid,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Feather name="arrow-left" size={18} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text
            style={{ fontSize: 17, fontFamily: fonts.heading2, color: colors.textPrimary, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {sessionTitle}
          </Text>
          {exerciseCount > 0 ? (
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyRegular, color: colors.textDim, marginTop: 1 }}>
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
              {totalSets > 0 ? ` · ${totalSets} sets` : ""}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading && exercises.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={`sk-${i}`} width="100%" height={140} borderRadius={radius.lg} />
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxxl }}>
          <View
            style={{
              width: 56, height: 56, borderRadius: radius.lg,
              backgroundColor: isDark ? colors.dangerSoft : colors.dangerSoft,
              alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
            }}
          >
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
          </View>
          <Text style={{ fontSize: 14, fontFamily: fonts.bodyRegular, color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
            {error}
          </Text>
        </View>
      ) : exercises.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxxl }}>
          <View
            style={{
              width: 64, height: 64, borderRadius: radius.xl,
              backgroundColor: isDark ? colors.surfaceHigh : colors.surfaceHigh,
              borderWidth: 1, borderColor: isDark ? colors.borderSubtle : colors.borderMid,
              alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
            }}
          >
            <Ionicons name="barbell-outline" size={30} color={colors.textDim} />
          </View>
          <Text style={{ fontSize: 16, fontFamily: fonts.heading3, color: colors.textPrimary, marginBottom: spacing.xs }}>
            No exercises yet
          </Text>
          <Text style={{ fontSize: 14, fontFamily: fonts.bodyRegular, color: colors.textSecondary, textAlign: "center" }}>
            Your coach hasn't added exercises to this session.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 140 }}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
            }
            showsVerticalScrollIndicator={false}
          >
            {exercises.map((ex, idx) => {
              const entering = reduceMotion
                ? undefined
                : FadeInDown.delay(Math.min(idx, 10) * 40).springify().damping(16);
              return (
                <Animated.View key={ex.id} entering={entering}>
                  <ExerciseCard
                    exercise={ex}
                    index={idx}
                    total={exercises.length}
                    colors={colors}
                    isDark={isDark}
                    videoExpanded={activeVideoId === ex.id}
                    onToggleVideo={() => setActiveVideoId((p) => (p === ex.id ? null : ex.id))}
                    uploadState={uploadStateByExId[ex.id]}
                    isUploading={isUploading}
                    onUploadPress={(source, sectionContentId) =>
                      handlePickAndUpload(ex.id, source, sectionContentId)
                    }
                  />
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* Fixed finish button */}
          <View
            style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: 36,
            }}
          >
            <LinearGradient
              colors={[
                isDark ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)",
                isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)",
                isDark ? "#000" : "#fff",
              ]}
              style={{ position: "absolute", top: -32, left: 0, right: 0, bottom: 0 }}
              pointerEvents="none"
            />
            <Pressable
              onPress={handleFinish}
              disabled={isCompleting}
              style={({ pressed }) => ({
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                paddingVertical: 15,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: spacing.sm,
                opacity: isCompleting ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                ...Shadows.md,
              })}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ fontSize: 16, fontFamily: fonts.accentBold, color: "#fff", letterSpacing: -0.2 }}>
                    Finish Session
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
      <BuiltinCamera
        visible={recorderVisible}
        maxDurationSeconds={VIDEO_MAX_DURATION_SECONDS}
        onCancel={() => {
          setRecorderVisible(false);
          setRecordingExerciseId(null);
          setRecordingSectionContentId(null);
        }}
        onRecorded={async ({ uri, width, height, duration }) => {
          setRecorderVisible(false);
          const exerciseId = recordingExerciseId;
          const sectionContentId = recordingSectionContentId;
          setRecordingExerciseId(null);
          setRecordingSectionContentId(null);
          if (!exerciseId) return;
          if (duration > VIDEO_MAX_DURATION_SECONDS) {
            Alert.alert("Video too long", `Please keep clips at ${VIDEO_MAX_DURATION_SECONDS}s or less.`);
            return;
          }
          const fileInfo = await FileSystem.getInfoAsync(uri);
          const sizeBytes = fileInfo.exists ? fileInfo.size : 0;
          if (fileInfo.exists && sizeBytes > VIDEO_MAX_BYTES) {
            Alert.alert("Video too large", `Video exceeds ${VIDEO_MAX_MB}MB limit. Record a shorter clip.`);
            return;
          }
          await handleUploadSelectedVideo(exerciseId, {
            uri,
            fileName: uri.split("/").pop() ?? "recording.mp4",
            contentType: "video/mp4",
            sizeBytes,
            width,
            height,
          }, sectionContentId);
        }}
      />
    </SafeAreaView>
  );
}

/* ═══════════════════════════ Exercise Card ═══════════════════════════ */

function ExerciseCard({
  exercise: ex,
  index,
  total,
  colors,
  isDark,
  videoExpanded,
  onToggleVideo,
  uploadState,
  isUploading,
  onUploadPress,
}: {
  exercise: SessionExercise;
  index: number;
  total: number;
  colors: Record<string, string>;
  isDark: boolean;
  videoExpanded: boolean;
  onToggleVideo: () => void;
  uploadState?: ExerciseUploadState;
  isUploading: boolean;
  onUploadPress: (source: "camera" | "library", sectionContentId?: number | null) => void;
}) {
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const meta = [
    ex.exercise.sets ? `${ex.exercise.sets} sets` : null,
    ex.exercise.reps ? `${ex.exercise.reps} reps` : null,
    ex.exercise.duration ? `${ex.exercise.duration}s` : null,
  ].filter(Boolean);

  const hasRest = ex.exercise.restSeconds && ex.exercise.restSeconds > 0;
  const hasVideo = !!ex.exercise.videoUrl;
  const hasCoachNotes = !!ex.coachingNotes;
  const hasProgression = !!ex.progressionNotes;
  const hasRegression = !!ex.regressionNotes;
  const hasCues = !!ex.exercise.cues;
  const hasHowTo = !!ex.exercise.howTo;
  const hasNotes = !!ex.exercise.notes;
  const hasTextDetails = hasCues || hasHowTo || hasNotes || hasProgression || hasRegression || hasCoachNotes;
  const rawSectionContentId =
    (ex as any).programSectionContentId ??
    (ex as any).sectionContentId ??
    (ex as any).trainingSessionItemId ??
    null;
  const resolvedSectionContentId =
    typeof rawSectionContentId === "number" && Number.isFinite(rawSectionContentId) && rawSectionContentId > 0
      ? rawSectionContentId
      : null;

  return (
    <View
      style={{
        backgroundColor: isDark ? colors.surfaceHigh : colors.card,
        borderWidth: 1,
        borderColor: isDark ? colors.borderSubtle : colors.borderMid,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        overflow: "hidden",
        ...(isDark ? {} : Shadows.sm),
      }}
    >
      {/* Card Header: order + name + meta */}
      <View style={{ padding: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 32, height: 32, borderRadius: radius.xs,
              backgroundColor: isDark ? colors.limeGlow : colors.limeGlow,
              borderWidth: 1, borderColor: isDark ? colors.borderLime : colors.borderLime,
              alignItems: "center", justifyContent: "center", marginRight: spacing.md,
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: fonts.accentBold, color: colors.accent }}>
              {ex.order}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontFamily: fonts.heading3, color: colors.textPrimary, letterSpacing: -0.2 }}
              numberOfLines={2}
            >
              {ex.exercise.name}
            </Text>
            {ex.exercise.category ? (
              <Text style={{ fontSize: 12, fontFamily: fonts.bodyRegular, color: colors.textDim, marginTop: 2 }}>
                {ex.exercise.category}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Meta Pills */}
        {meta.length > 0 || hasRest ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
            {meta.map((m, i) => (
              <View
                key={i}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.xs,
                  backgroundColor: isDark ? colors.surfaceHigher : colors.surfaceHigh,
                  borderWidth: 1, borderColor: isDark ? colors.borderSubtle : colors.borderMid,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: fonts.labelMedium, color: colors.textPrimary }}>{m}</Text>
              </View>
            ))}
            {hasRest ? (
              <View
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.xs,
                  backgroundColor: isDark ? colors.amberGlow : colors.amberGlow,
                  borderWidth: 1, borderColor: isDark ? "rgba(255,176,32,0.2)" : "rgba(245,158,11,0.2)",
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: fonts.labelMedium, color: colors.amber }}>
                  {ex.exercise.restSeconds}s rest
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Video Section - inline in body */}
      {hasVideo ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <View
            style={{
              borderRadius: radius.md,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: isDark ? colors.borderSubtle : colors.borderMid,
            }}
          >
            <VideoPlayer
              uri={ex.exercise.videoUrl!}
              height={200}
              autoPlay
              initialMuted={false}
              isLooping
              hideTopChrome
              ignoreTabFocus
            />
          </View>

          <Card
            variant={isDark ? "secondary" : "default"}
            style={{
              marginTop: spacing.sm,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: isDark ? colors.borderMid : colors.borderMid,
              overflow: "visible",
            }}
          >
            <Card.Header style={{ paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: fonts.labelCaps, color: colors.textDim, letterSpacing: 0.8 }}>
                Upload Your Video
              </Text>
            </Card.Header>
            <Card.Body style={{ paddingHorizontal: spacing.md, paddingBottom: 10, paddingTop: 0 }}>
              {uploadState?.progress != null && uploadState.progress < 1 ? (
                <View
                  style={{
                    height: 42,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: isDark ? colors.borderMid : colors.borderMid,
                    backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                    overflow: "hidden",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.round(uploadState.progress * 100)}%` as any,
                      backgroundColor: isDark ? "rgba(163,230,53,0.12)" : "rgba(132,204,22,0.12)",
                      borderRadius: radius.sm,
                    }}
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={{ fontSize: 12, fontFamily: fonts.labelMedium, color: colors.accent }}>
                      {uploadState.statusText || `Uploading ${Math.round(uploadState.progress * 100)}%...`}
                    </Text>
                  </View>
                </View>
              ) : uploadState?.progress === 1 ? (
                <View
                  style={{
                    height: 42,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: isDark ? colors.borderLime : colors.borderLime,
                    backgroundColor: isDark ? colors.limeGlow : colors.accentLight,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: spacing.sm,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
                  <Text style={{ fontSize: 12, fontFamily: fonts.labelMedium, color: colors.accent }}>
                    Uploaded!
                  </Text>
                </View>
              ) : (
                <View style={{ gap: spacing.sm, position: "relative" }}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsSourceMenuOpen((v) => !v);
                    }}
                    disabled={isUploading}
                    style={({ pressed }) => ({
                      height: 42,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: isDark ? colors.borderMid : colors.borderMid,
                      borderStyle: "dashed" as const,
                      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: spacing.sm,
                      opacity: isUploading ? 0.4 : pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons name="cloud-upload-outline" size={15} color={colors.textDim} />
                    <Text style={{ fontSize: 12, fontFamily: fonts.labelMedium, color: colors.textDim }}>
                      Choose Source
                    </Text>
                  </Pressable>

                  {isSourceMenuOpen ? (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 48,
                        left: 0,
                        right: 0,
                        zIndex: 30,
                        borderWidth: 1,
                        borderColor: isDark ? colors.borderSubtle : colors.borderMid,
                        borderRadius: radius.sm,
                        backgroundColor: isDark ? colors.surfaceHigher : colors.surfaceHigh,
                        overflow: "hidden",
                        ...(isDark ? Shadows.sm : Shadows.md),
                      }}
                    >
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsSourceMenuOpen(false);
                          setTimeout(() => onUploadPress("camera", resolvedSectionContentId), 50);
                        }}
                        style={({ pressed }) => ({
                          minHeight: 42,
                          paddingHorizontal: spacing.md,
                          justifyContent: "center",
                          backgroundColor: pressed
                            ? isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,23,42,0.06)"
                            : "transparent",
                        })}
                      >
                        <Text style={{ fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textPrimary }}>
                          Record Video
                        </Text>
                      </Pressable>
                      <View style={{ height: 1, backgroundColor: isDark ? colors.borderSubtle : colors.borderMid }} />
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsSourceMenuOpen(false);
                          setTimeout(() => onUploadPress("library", resolvedSectionContentId), 50);
                        }}
                        style={({ pressed }) => ({
                          minHeight: 42,
                          paddingHorizontal: spacing.md,
                          justifyContent: "center",
                          backgroundColor: pressed
                            ? isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,23,42,0.06)"
                            : "transparent",
                        })}
                      >
                        <Text style={{ fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textPrimary }}>
                          Choose from Library
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              )}
            </Card.Body>
          </Card>
          {uploadState?.error ? (
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyRegular, color: colors.danger, marginTop: 4, textAlign: "center" }}>
              {uploadState.error}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Details Section */}
      {hasTextDetails ? (
        <View
          style={{
            marginHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: isDark ? colors.borderSubtle : colors.borderMid,
            gap: spacing.md,
          }}
        >
          {hasCues ? <DetailBlock icon="zap" label="Cues" text={ex.exercise.cues!} colors={colors} /> : null}
          {hasHowTo ? <DetailBlock icon="info" label="How To" text={ex.exercise.howTo!} colors={colors} /> : null}
          {hasNotes ? <DetailBlock icon="file-text" label="Notes" text={ex.exercise.notes!} colors={colors} /> : null}

          {hasProgression ? (
            <AccentCallout
              icon="trending-up" label="Progression" text={ex.progressionNotes!}
              accentColor={isDark ? "#60A5FA" : "#3B82F6"}
              bgColor={isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)"}
              borderColor={isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.14)"}
              colors={colors}
            />
          ) : null}

          {hasRegression ? (
            <AccentCallout
              icon="trending-down" label="Regression" text={ex.regressionNotes!}
              accentColor={isDark ? "#FB923C" : "#F97316"}
              bgColor={isDark ? "rgba(249,115,22,0.06)" : "rgba(249,115,22,0.04)"}
              borderColor={isDark ? "rgba(249,115,22,0.18)" : "rgba(249,115,22,0.14)"}
              colors={colors}
            />
          ) : null}

          {hasCoachNotes ? (
            <AccentCallout
              icon="message-circle" label="Coach" text={ex.coachingNotes!}
              accentColor={colors.accent}
              bgColor={isDark ? colors.limeGlow : colors.accentLight}
              borderColor={isDark ? colors.borderLime : colors.borderLime}
              colors={colors}
            />
          ) : null}

          {ex.videoUpload && (ex.videoUpload.coachVideoUrl || ex.videoUpload.feedback) ? (
            <View
              style={{
                marginTop: spacing.sm,
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: isDark ? "rgba(138, 255, 0, 0.05)" : "rgba(138, 255, 0, 0.03)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(138, 255, 0, 0.15)" : "rgba(138, 255, 0, 0.1)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md }}>
                <Ionicons name="videocam" size={16} color={colors.accent} />
                <Text style={{ fontSize: 12, fontFamily: fonts.accentBold, color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Coach Feedback
                </Text>
              </View>

              {ex.videoUpload.coachVideoUrl ? (
                <View style={{ borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.sm }}>
                  <VideoPlayer uri={ex.videoUpload.coachVideoUrl} height={180} />
                </View>
              ) : null}

              {ex.videoUpload.feedback ? (
                <Text style={{ fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textPrimary, lineHeight: 20, fontStyle: "italic" }}>
                  "{ex.videoUpload.feedback}"
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ═══════════════════════════ Detail Block ═══════════════════════════ */

function DetailBlock({
  icon,
  label,
  text,
  colors,
}: {
  icon: string;
  label: string;
  text: string;
  colors: Record<string, string>;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
        <Feather name={icon as any} size={12} color={colors.textDim} />
        <Text
          style={{
            fontSize: 11, fontFamily: fonts.labelCaps, color: colors.textDim,
            textTransform: "uppercase", letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 13, fontFamily: fonts.bodyRegular, color: colors.textSecondary, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

/* ═══════════════════════════ Accent Callout ═══════════════════════════ */

function AccentCallout({
  icon,
  label,
  text,
  accentColor,
  bgColor,
  borderColor,
  colors,
}: {
  icon: string;
  label: string;
  text: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  colors: Record<string, string>;
}) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.sm,
        backgroundColor: bgColor, borderWidth: 1, borderColor,
        borderLeftWidth: 3, borderLeftColor: accentColor,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs }}>
        <Feather name={icon as any} size={12} color={accentColor} />
        <Text
          style={{
            fontSize: 11, fontFamily: fonts.labelCaps, color: accentColor,
            textTransform: "uppercase", letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 13, fontFamily: fonts.bodyRegular, color: colors.textPrimary, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

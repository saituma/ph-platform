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
import {
  ArrowLeft,
  AlertCircle,
  Dumbbell,
  CheckCircle,
  CloudUpload,
  Zap,
  Info,
  FileText,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Video,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { BuiltinCamera } from "@/components/media/BuiltinCamera";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import {
  useMySessionExercises,
  useCompleteSession,
  type SessionExercise,
} from "@/hooks/programs/useMyPrograms";
import { useVideoUploadLogic } from "@/hooks/programs/useVideoUploadLogic";
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
  const p = useAdminPastel();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: p.divider,
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
            borderRadius: 100,
            backgroundColor: p.accentSoft,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowLeft size={18} color={p.accent} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{ fontSize: 17, fontFamily: "Outfit-Bold", color: p.textPrimary, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {sessionTitle}
          </Text>
          {exerciseCount > 0 ? (
            <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 1 }}>
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
              {totalSets > 0 ? ` · ${totalSets} sets` : ""}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading && exercises.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={`sk-${i}`} width="100%" height={140} borderRadius={22} />
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View
            style={{
              width: 56, height: 56, borderRadius: 22,
              backgroundColor: p.dangerSoft,
              alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}
          >
            <AlertCircle size={28} color={p.danger} />
          </View>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center", lineHeight: 20 }}>
            {error}
          </Text>
        </View>
      ) : exercises.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View
            style={{
              width: 64, height: 64, borderRadius: 22,
              backgroundColor: p.cardWhite,
              alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}
          >
            <Dumbbell size={30} color={p.textMuted} />
          </View>
          <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 4 }}>
            No exercises yet
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
            Your coach hasn't added exercises to this session.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={p.accent} />
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
                    p={p}
                    videoExpanded={activeVideoId === ex.id}
                    onToggleVideo={() => setActiveVideoId((prev) => (prev === ex.id ? null : ex.id))}
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
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 36,
            }}
          >
            <LinearGradient
              colors={[
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.95)",
                "#fff",
              ]}
              style={{ position: "absolute", top: -32, left: 0, right: 0, bottom: 0 }}
              pointerEvents="none"
            />
            <Pressable
              onPress={handleFinish}
              disabled={isCompleting}
              style={({ pressed }) => ({
                backgroundColor: p.accent,
                borderRadius: 100,
                paddingVertical: 15,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: isCompleting ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color={p.buttonPrimaryText} />
              ) : (
                <>
                  <CheckCircle size={20} color={p.buttonPrimaryText} />
                  <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText, letterSpacing: -0.2 }}>
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
  p,
  videoExpanded,
  onToggleVideo,
  uploadState,
  isUploading,
  onUploadPress,
}: {
  exercise: SessionExercise;
  index: number;
  total: number;
  p: ReturnType<typeof useAdminPastel>;
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
        backgroundColor: p.cardWhite,
        borderRadius: 22,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {/* Card Header: order + name + meta */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 32, height: 32, borderRadius: 8,
              backgroundColor: p.accentSoft,
              alignItems: "center", justifyContent: "center", marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: "Outfit-Bold", color: p.accent }}>
              {ex.order}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontFamily: "Outfit-Bold", color: p.textPrimary, letterSpacing: -0.2 }}
              numberOfLines={2}
            >
              {ex.exercise.name}
            </Text>
            {ex.exercise.category ? (
              <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 2 }}>
                {ex.exercise.category}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Meta Pills */}
        {meta.length > 0 || hasRest ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {meta.map((m, i) => (
              <View
                key={i}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
                  backgroundColor: p.inputBg,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textPrimary }}>{m}</Text>
              </View>
            ))}
            {hasRest ? (
              <View
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
                  backgroundColor: p.warningSoft,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.warning }}>
                  {ex.exercise.restSeconds}s rest
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Video Section */}
      {hasVideo ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View
            style={{
              borderRadius: 14,
              overflow: "hidden",
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

          <View
            style={{
              marginTop: 8,
              borderRadius: 14,
              backgroundColor: p.inputBg,
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
              Upload Your Video
            </Text>
            {uploadState?.progress != null && uploadState.progress < 1 ? (
              <View
                style={{
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: p.cardWhite,
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
                    backgroundColor: p.accentSoft,
                    borderRadius: 14,
                  }}
                />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <ActivityIndicator size="small" color={p.accent} />
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.accent }}>
                    {uploadState.statusText || `Uploading ${Math.round(uploadState.progress * 100)}%...`}
                  </Text>
                </View>
              </View>
            ) : uploadState?.progress === 1 ? (
              <View
                style={{
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: p.successSoft,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <CheckCircle size={15} color={p.success} />
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.success }}>
                  Uploaded!
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8, position: "relative" }}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsSourceMenuOpen((v) => !v);
                  }}
                  disabled={isUploading}
                  style={({ pressed }) => ({
                    height: 42,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: p.divider,
                    borderStyle: "dashed" as const,
                    backgroundColor: p.cardWhite,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: isUploading ? 0.4 : pressed ? 0.6 : 1,
                  })}
                >
                  <CloudUpload size={15} color={p.textMuted} />
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted }}>
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
                      borderRadius: 14,
                      backgroundColor: p.cardWhite,
                      overflow: "hidden",
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
                        paddingHorizontal: 14,
                        justifyContent: "center",
                        backgroundColor: pressed ? p.accentSoft : "transparent",
                      })}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary }}>
                        Record Video
                      </Text>
                    </Pressable>
                    <View style={{ height: 1, backgroundColor: p.divider }} />
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsSourceMenuOpen(false);
                        setTimeout(() => onUploadPress("library", resolvedSectionContentId), 50);
                      }}
                      style={({ pressed }) => ({
                        minHeight: 42,
                        paddingHorizontal: 14,
                        justifyContent: "center",
                        backgroundColor: pressed ? p.accentSoft : "transparent",
                      })}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary }}>
                        Choose from Library
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          {uploadState?.error ? (
            <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.danger, marginTop: 4, textAlign: "center" }}>
              {uploadState.error}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Details Section */}
      {hasTextDetails ? (
        <View
          style={{
            marginHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 16,
            borderTopWidth: 1,
            borderTopColor: p.divider,
            gap: 12,
          }}
        >
          {hasCues ? <DetailBlock Icon={Zap} label="Cues" text={ex.exercise.cues!} p={p} /> : null}
          {hasHowTo ? <DetailBlock Icon={Info} label="How To" text={ex.exercise.howTo!} p={p} /> : null}
          {hasNotes ? <DetailBlock Icon={FileText} label="Notes" text={ex.exercise.notes!} p={p} /> : null}

          {hasProgression ? (
            <AccentCallout
              Icon={TrendingUp} label="Progression" text={ex.progressionNotes!}
              accentColor={p.info}
              bgColor={p.infoSoft}
              p={p}
            />
          ) : null}

          {hasRegression ? (
            <AccentCallout
              Icon={TrendingDown} label="Regression" text={ex.regressionNotes!}
              accentColor={p.warning}
              bgColor={p.warningSoft}
              p={p}
            />
          ) : null}

          {hasCoachNotes ? (
            <AccentCallout
              Icon={MessageCircle} label="Coach" text={ex.coachingNotes!}
              accentColor={p.accent}
              bgColor={p.accentSoft}
              p={p}
            />
          ) : null}

          {ex.videoUpload && (ex.videoUpload.coachVideoUrl || ex.videoUpload.feedback) ? (
            <View
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 14,
                backgroundColor: p.accentSoft,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Video size={16} color={p.accent} />
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Coach Feedback
                </Text>
              </View>

              {ex.videoUpload.coachVideoUrl ? (
                <View style={{ borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
                  <VideoPlayer uri={ex.videoUpload.coachVideoUrl} height={180} />
                </View>
              ) : null}

              {ex.videoUpload.feedback ? (
                <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary, lineHeight: 20, fontStyle: "italic" }}>
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
  Icon,
  label,
  text,
  p,
}: {
  Icon: any;
  label: string;
  text: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Icon size={12} color={p.textMuted} />
        <Text
          style={{
            fontSize: 11, fontFamily: "Outfit-Bold", color: p.textMuted,
            textTransform: "uppercase", letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

/* ═══════════════════════════ Accent Callout ═══════════════════════════ */

function AccentCallout({
  Icon,
  label,
  text,
  accentColor,
  bgColor,
  p,
}: {
  Icon: any;
  label: string;
  text: string;
  accentColor: string;
  bgColor: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
        backgroundColor: bgColor,
        borderLeftWidth: 3, borderLeftColor: accentColor,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon size={12} color={accentColor} />
        <Text
          style={{
            fontSize: 11, fontFamily: "Outfit-Bold", color: accentColor,
            textTransform: "uppercase", letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

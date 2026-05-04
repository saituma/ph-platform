import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import {
  useMySessionExercises,
  useCompleteSession,
  type SessionExercise,
} from "@/hooks/programs/useMyPrograms";
import { Shadows, radius, spacing, fonts } from "@/constants/theme";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import { VideoPlayer } from "@/components/media/VideoPlayer";

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

  const { exercises, isLoading, error, loadExercises } = useMySessionExercises(token);
  const { completeSession, isCompleting } = useCompleteSession(token);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

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
}: {
  exercise: SessionExercise;
  index: number;
  total: number;
  colors: Record<string, string>;
  isDark: boolean;
  videoExpanded: boolean;
  onToggleVideo: () => void;
}) {
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
          {videoExpanded ? (
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
              <Pressable
                onPress={onToggleVideo}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleVideo();
              }}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: radius.sm,
                backgroundColor: isDark ? colors.surfaceHigher : colors.surfaceHigh,
                borderWidth: 1,
                borderColor: isDark ? colors.borderSubtle : colors.borderMid,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: spacing.md,
                gap: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 34, height: 34, borderRadius: radius.xs,
                  backgroundColor: isDark ? colors.limeGlow : colors.accentLight,
                  borderWidth: 1, borderColor: isDark ? colors.borderLime : colors.borderLime,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name="play" size={15} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: fonts.labelMedium, color: colors.textPrimary }}>
                  Watch Demo
                </Text>
                <Text style={{ fontSize: 11, fontFamily: fonts.bodyRegular, color: colors.textDim }}>
                  Tap to play exercise video
                </Text>
              </View>
              <Feather name="play-circle" size={18} color={colors.textDim} />
            </Pressable>
          )}

          {/* Upload your video */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["videos"],
                quality: 0.8,
                videoMaxDuration: 120,
              });
            }}
            style={({ pressed }) => ({
              marginTop: spacing.sm,
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
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="cloud-upload-outline" size={15} color={colors.textDim} />
            <Text style={{ fontSize: 12, fontFamily: fonts.labelMedium, color: colors.textDim }}>
              Upload Your Video
            </Text>
          </Pressable>
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type RelativePathString } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, TextInput } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { VideoPlayer, isYoutubeUrl, YouTubeEmbed } from "@/components/media/VideoPlayer";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { SafeMaskedView, Transition } from "@/components/navigation/TransitionStack";

import { canAccessTier } from "@/lib/planAccess";
import { useAgeExperience } from "@/context/AgeExperienceContext";

type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

type ContentItem = {
  title: string;
  body: string;
  completed?: boolean | null;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
};

// Detect external video hosting
function isExternalVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    lower.includes("loom.com") ||
    lower.includes("streamable.com") ||
    lower.includes("drive.google.com")
  );
}

function isGoogleDriveUrl(url: string): boolean {
  return url.toLowerCase().includes("drive.google.com");
}

const ExternalLinkButton = React.memo(function ExternalLinkButton({ url, label }: { url: string; label: string }) {
  const { isDark } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      className="rounded-2xl bg-white/10 px-5 py-4 flex-row items-center gap-3"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <Feather name="external-link" size={18} color="#FFFFFF" />
      <View className="flex-1">
        <Text className="text-sm font-outfit text-white font-semibold">{label}</Text>
        <Text className="text-[11px] font-outfit text-white/80 mt-0.5" numberOfLines={1}>{url}</Text>
      </View>
      <Feather name="chevron-right" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
});

const MediaSection = React.memo(function MediaSection({ url, title }: { url: string; title?: string }) {
  if (isYoutubeUrl(url)) {
    return <YouTubeEmbed url={url} />;
  }

  if (isGoogleDriveUrl(url)) {
    return <ExternalLinkButton url={url} label="Open in Google Drive" />;
  }

  if (isExternalVideoUrl(url)) {
    const lower = url.toLowerCase();
    let label = "Open Video";
    if (lower.includes("vimeo.com")) label = "Open in Vimeo";
    else if (lower.includes("loom.com")) label = "Open in Loom";
    else if (lower.includes("streamable.com")) label = "Open in Streamable";
    return <ExternalLinkButton url={url} label={label} />;
  }

  return (
    <View className="rounded-3xl overflow-hidden bg-white/5">
      <VideoPlayer uri={url} title={title} ignoreTabFocus />
    </View>
  );
});

const contentCheckinModalStyles = StyleSheet.create({
  root: { flex: 1 },
});

export default function ProgramContentDetailScreen() {
  const { contentId, sharedBoundTag, exerciseDetail, sessionIds, index } = useLocalSearchParams<{
    contentId: string;
    sharedBoundTag?: string;
    exerciseDetail?: string;
    sessionIds?: string;
    index?: string;
  }>();
  const router = useRouter();
  const { token } = useAppSelector((state) => state.user);

  const programTier = useAppSelector((state) => state.user.programTier);
  const { isDark, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isSectionHidden } = useAgeExperience();
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ContentItem | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rpe, setRpe] = useState("");
  const [soreness, setSoreness] = useState("");
  const [fatigue, setFatigue] = useState("");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const lastLoadedRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const load = useCallback(async (force = false) => {
    if (!token || !contentId) {
      setIsLoading(false);
      setError("Content not available.");
      return;
    }
    const key = `${token}:${contentId}`;
    if (!force && lastLoadedRef.current === key) {
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setIsLoading(true);
      const data = await apiRequest<{ item?: any }>(`/program-section-content/${contentId}`, {
        token,
        forceRefresh: force,
        skipCache: true,
      });
      if (!data.item) {
        setItem(null);
        setError("Content not found.");
        return;
      }
      setItem({
        title: data.item.title ?? "Program Content",
        body: data.item.body ?? "",
        completed: Boolean(data.item.completed),
        videoUrl: data.item.videoUrl ?? null,
        allowVideoUpload: data.item.allowVideoUpload ?? false,
        metadata: data.item.metadata ?? null,
      });
      setError(null);
      lastLoadedRef.current = key;
    } catch (err: any) {
      setError(err?.message ?? "Failed to load content.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [contentId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const meta = (item?.metadata ?? {}) as ExerciseMetadata;
  const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);
  const isExerciseDetail = exerciseDetail === "1" || exerciseDetail === "true";
  const activeAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return managedAthletes.find((athlete) => athlete.id === athleteUserId || athlete.userId === athleteUserId) ?? managedAthletes[0];
  }, [athleteUserId, managedAthletes]);
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const canUploadVideos =
    canAccessTier(programTier ?? null, "PHP_Premium") &&
    !isSectionHidden("videoFeedback");
  const canLogCompletion = true;
  const showUploadFab = Boolean(item?.allowVideoUpload) && canUploadVideos;
  const sessionExerciseIds = useMemo(
    () =>
      String(sessionIds ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [sessionIds],
  );
  const sessionIndex = useMemo(() => {
    const parsed = Number(index);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  }, [index]);
  const hasSessionNavigation = isExerciseDetail && sessionExerciseIds.length > 1;
  const previousExerciseId = hasSessionNavigation && sessionIndex > 0 ? sessionExerciseIds[sessionIndex - 1] ?? null : null;
  const nextExerciseId =
    hasSessionNavigation && sessionIndex < sessionExerciseIds.length - 1
      ? sessionExerciseIds[sessionIndex + 1] ?? null
      : null;
  useEffect(() => {
    if (router.canGoBack()) return;
    router.replace("/(tabs)");
  }, [router]);
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/programs");
  }, [router]);
  const buildExercisePath = useCallback(
    (targetId: string, targetIndex: number) =>
      `/programs/content/${targetId}?exerciseDetail=1&sessionIds=${encodeURIComponent(sessionExerciseIds.join(","))}&index=${targetIndex}` as RelativePathString,
    [sessionExerciseIds],
  );

  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: hasSessionNavigation ? 136 : 40 }),
    [hasSessionNavigation],
  );
  const contentBody = useMemo(() => {
    if (!item?.body) return null;
    return (
      <MarkdownText
        text={item.body}
        baseStyle={{ fontSize: 15, lineHeight: 24, color: colors.text }}
        headingStyle={{ fontSize: 18, lineHeight: 26, color: colors.text, fontWeight: "700" }}
        subheadingStyle={{ fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: "700" }}
        listItemStyle={{ paddingLeft: 6 }}
      />
    );
  }, [item?.body, colors.text]);
  const mediaSection = useMemo(() => {
    if (!item?.videoUrl) return null;
    return (
      <View className="mt-1">
        <MediaSection url={item.videoUrl} title={item.title} />
      </View>
    );
  }, [item?.title, item?.videoUrl]);

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <SafeMaskedView style={{ flex: 1 }}>
        <ThemedScrollView
          onRefresh={() => load(true)}
          contentContainerStyle={contentContainerStyle}
        >
          <View className="px-6 pt-6">
            <Transition.View
              sharedBoundTag={sharedBoundTag}
              className="overflow-hidden rounded-[30px] border px-5 py-5 mb-6"
              style={{ backgroundColor: surfaceColor, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.md) }}
            >
              <View className="absolute -right-10 -top-8 h-28 w-28 rounded-full" style={{ backgroundColor: accentSurface }} />
              <View className="flex-row items-center justify-between mb-4">
                <Pressable
                  onPress={handleBack}
                  className="h-11 w-11 items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Feather name="arrow-left" size={20} color={colors.accent} />
                </Pressable>
                <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
                    {isExerciseDetail ? "Exercise detail" : "Content detail"}
                  </Text>
                </View>
              </View>

              <Text className="text-3xl font-telma-bold text-app font-bold">
                {item?.title ?? "Program Content"}
              </Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {activeAthlete?.name ? (
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: accentSurface }}>
                    <Text className="text-[11px] font-outfit font-semibold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
                      Athlete: {activeAthlete.name}
                    </Text>
                  </View>
                ) : null}
                {activeAthlete?.age ? (
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: mutedSurface }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                      {activeAthlete.age} yrs
                    </Text>
                  </View>
                ) : null}
                {meta.category ? (
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: mutedSurface }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                      {meta.category}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Transition.View>

          {isLoading ? (
            <View className="rounded-3xl bg-[#2F8F57] px-6 py-6 items-center" style={isDark ? Shadows.none : Shadows.sm}>
              <ActivityIndicator color="#FFFFFF" />
              <Text className="text-sm font-outfit text-white mt-2">Loading content...</Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl bg-[#2F8F57] px-6 py-6" style={isDark ? Shadows.none : Shadows.sm}>
              <Text className="text-sm font-outfit text-white text-center">{error}</Text>
            </View>
          ) : item ? (
            <View className="gap-4">
              {/* Main content card */}
              <View className="rounded-[28px] px-6 py-6 gap-4" style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}>
                <Text className="text-2xl font-clash text-app font-bold">
                  {isExerciseDetail ? "Exercise overview" : "Overview"}
                </Text>

                {/* Exercise metadata badges */}
                {hasExercise && (
                  <View className="flex-row flex-wrap gap-2">
                    {meta.sets != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.sets} sets</Text>
                      </View>
                    )}
                    {meta.reps != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.reps} reps</Text>
                      </View>
                    )}
                    {meta.duration != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.duration}s duration</Text>
                      </View>
                    )}
                    {meta.restSeconds != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.restSeconds}s rest</Text>
                      </View>
                    )}
                    {meta.category && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                        <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>{meta.category}</Text>
                      </View>
                    )}
                    {meta.equipment && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.text }}>🏋️ {meta.equipment}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Body content */}
                {contentBody}

                {canLogCompletion ? (
                  <Pressable
                    onPress={() => {
                      setCheckinSaved(false);
                      setCheckinError(null);
                      setShowCompleteModal(true);
                    }}
                    className="mt-4 rounded-2xl px-4 py-4 flex-row items-center justify-center gap-2"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Feather name="check-circle" size={18} color="#ffffff" />
                    <Text className="text-white font-outfit font-bold text-sm uppercase tracking-[1.3px]">
                      {isExerciseDetail ? "Mark exercise complete" : "Mark as Complete"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Coaching Cues */}
              {meta.cues ? (
                <View className="rounded-3xl bg-[#2F8F57] px-6 py-5 gap-3" style={isDark ? Shadows.none : Shadows.sm}>
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 rounded-full bg-white/20 items-center justify-center">
                      <Feather name="message-circle" size={14} color="#FFFFFF" />
                    </View>
                    <Text className="text-[12px] font-outfit text-white uppercase tracking-[2px] font-bold">
                      Coaching Cues
                    </Text>
                  </View>
                  <Text className="text-[15px] font-outfit text-white leading-[24px]">{meta.cues}</Text>
                </View>
              ) : null}

              {/* Steps */}
              {meta.steps ? (
                <View className="rounded-3xl bg-[#0F766E] px-6 py-5 gap-3" style={isDark ? Shadows.none : Shadows.sm}>
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 rounded-full bg-white/20 items-center justify-center">
                      <Feather name="list" size={14} color="#FFFFFF" />
                    </View>
                    <Text className="text-[12px] font-outfit text-white uppercase tracking-[2px] font-bold">
                      Steps
                    </Text>
                  </View>
                  <Text className="text-[15px] font-outfit text-white leading-[24px]">{meta.steps}</Text>
                </View>
              ) : null}

              {/* Progression / Regression */}
              {(meta.progression || meta.regression) ? (
                <View className="flex-row gap-4">
                  {meta.progression ? (
                    <View className="flex-1 rounded-3xl bg-[#22C55E] px-5 py-5 gap-3" style={isDark ? Shadows.none : Shadows.sm}>
                      <View className="flex-row items-center gap-2">
                        <View className="h-8 w-8 rounded-full bg-white/30 items-center justify-center">
                          <Feather name="trending-up" size={14} color="#FFFFFF" />
                        </View>
                        <Text className="text-[11px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                          Progression
                        </Text>
                      </View>
                      <Text className="text-[14px] font-outfit text-white leading-relaxed">{meta.progression}</Text>
                    </View>
                  ) : null}
                  {meta.regression ? (
                     <View className="flex-1 rounded-3xl bg-[#F97316] px-5 py-5 gap-3" style={isDark ? Shadows.none : Shadows.sm}>
                       <View className="flex-row items-center gap-2">
                         <View className="h-8 w-8 rounded-full bg-white/30 items-center justify-center">
                           <Feather name="trending-down" size={14} color="#FFFFFF" />
                         </View>
                         <Text className="text-[11px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                           Regression
                         </Text>
                       </View>
                       <Text className="text-[14px] font-outfit text-white leading-relaxed">{meta.regression}</Text>
                     </View>
                   ) : null}
                 </View>
               ) : null}
 
             {/* Media */}
             {mediaSection}


             </View>
           ) : null}
         </View>
       </ThemedScrollView>

        {hasSessionNavigation ? (
          <View
            className="absolute left-6 right-6 flex-row items-center gap-3 rounded-[28px] border px-4 py-4"
            style={{
              bottom: 20,
              backgroundColor: surfaceColor,
              borderColor: borderSoft,
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <Pressable
              onPress={() => {
                if (!previousExerciseId) return;
                router.replace(buildExercisePath(previousExerciseId, sessionIndex - 1));
              }}
              disabled={!previousExerciseId}
              className={`flex-1 rounded-2xl px-4 py-4 items-center justify-center ${previousExerciseId ? "" : "opacity-50"}`}
              style={{ backgroundColor: mutedSurface }}
            >
              <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.text }}>
                Previous
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (nextExerciseId) {
                  router.replace(buildExercisePath(nextExerciseId, sessionIndex + 1));
                  return;
                }
                if (router.canGoBack()) {
                  router.back();
                  return;
                }
                router.replace("/(tabs)/programs");
              }}
              className="flex-1 rounded-2xl px-4 py-4 items-center justify-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px] text-white">
                {nextExerciseId ? "Next" : "Finish Session"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {showUploadFab ? (
          <Pressable
            onPress={() => {
              const params = new URLSearchParams();
              if (Number.isFinite(Number(contentId))) {
                params.set("sectionContentId", String(contentId));
              }
              if (item?.title) {
                params.set("sectionTitle", item.title);
              }
              router.push(`/video-upload?${params.toString()}` as any);
            }}
            className="absolute bottom-6 right-6 h-14 w-14 rounded-full items-center justify-center"
            style={{
              bottom: hasSessionNavigation ? 96 : 24,
              backgroundColor: colors.accent,
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <Feather name="plus" size={24} color="#ffffff" />
          </Pressable>
        ) : null}

        

        <Modal
          visible={showCompleteModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (isSubmittingCheckin) return;
            setShowCompleteModal(false);
          }}
        >
          <KeyboardAvoidingView
            style={contentCheckinModalStyles.root}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <View
              className="flex-1 justify-end"
              style={{ backgroundColor: isDark ? "rgba(34,197,94,0.18)" : "rgba(15,23,42,0.18)" }}
            >
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={() => {
                  if (isSubmittingCheckin) return;
                  Keyboard.dismiss();
                  setShowCompleteModal(false);
                }}
                accessibilityLabel="Dismiss check-in"
              />
              <View
                className="rounded-t-3xl"
                style={{ backgroundColor: surfaceColor, maxHeight: "88%" }}
              >
                <KeyboardAwareScrollView
                  enableOnAndroid
                  extraHeight={Platform.OS === "ios" ? 120 : 160}
                  extraScrollHeight={Platform.OS === "ios" ? 40 : 96}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  bounces={Platform.OS === "ios"}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: Math.max(insets.bottom, 12) + 16,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-lg font-clash text-app font-bold">Session Check-in</Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (isSubmittingCheckin) return;
                        Keyboard.dismiss();
                        setShowCompleteModal(false);
                      }}
                      className="h-10 w-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: mutedSurface }}
                    >
                      <Feather name="x" size={20} color={colors.accent} />
                    </TouchableOpacity>
                  </View>

                  <Text className="text-sm font-outfit text-secondary mb-4">
                    Log intensity and how your body feels so your coach can adjust training load.
                  </Text>

                  <View className="gap-3">
                    <View className="rounded-2xl border px-4 py-3" style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}>
                      <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">RPE (1–10)</Text>
                      <TextInput
                        value={rpe}
                        onChangeText={setRpe}
                        placeholder="e.g. 7"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        className="text-base font-outfit text-app mt-1"
                      />
                    </View>
                    <View className="rounded-2xl border px-4 py-3" style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}>
                      <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">Soreness (0–10)</Text>
                      <TextInput
                        value={soreness}
                        onChangeText={setSoreness}
                        placeholder="e.g. 3"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        className="text-base font-outfit text-app mt-1"
                      />
                    </View>
                    <View className="rounded-2xl border px-4 py-3" style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}>
                      <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">Fatigue (0–10)</Text>
                      <TextInput
                        value={fatigue}
                        onChangeText={setFatigue}
                        placeholder="e.g. 4"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        className="text-base font-outfit text-app mt-1"
                      />
                    </View>
                    <View className="rounded-2xl border px-4 py-3" style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}>
                      <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">Notes (optional)</Text>
                      <TextInput
                        value={checkinNotes}
                        onChangeText={setCheckinNotes}
                        placeholder="Anything your coach should know…"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                        className="text-base font-outfit text-app mt-1"
                        style={{ minHeight: 56 }}
                      />
                    </View>

                    {checkinError ? (
                      <Text className="text-xs font-outfit" style={{ color: isDark ? "#FCA5A5" : colors.danger }}>
                        {checkinError}
                      </Text>
                    ) : null}
                    {checkinSaved ? (
                      <Text className="text-xs font-outfit" style={{ color: colors.accent }}>
                        Saved. Nice work.
                      </Text>
                    ) : null}

                    <Pressable
                      onPress={async () => {
                        if (!token || !contentId) return;
                        if (isSubmittingCheckin) return;
                        const parseBoundedInt = (value: string, min: number, max: number) => {
                          if (!value.trim()) return null;
                          const num = Math.round(Number(value));
                          if (!Number.isFinite(num) || num < min || num > max) return "invalid";
                          return num;
                        };
                        const parsedRpe = parseBoundedInt(rpe, 1, 10);
                        const parsedSoreness = parseBoundedInt(soreness, 0, 10);
                        const parsedFatigue = parseBoundedInt(fatigue, 0, 10);
                        if (parsedRpe === "invalid" || parsedSoreness === "invalid" || parsedFatigue === "invalid") {
                          setCheckinError("Please enter valid numbers (RPE 1–10, soreness/fatigue 0–10).");
                          return;
                        }
                        setIsSubmittingCheckin(true);
                        setCheckinError(null);
                        try {
                          await apiRequest(
                            `/program-section-content/${encodeURIComponent(String(contentId))}/complete`,
                            {
                              method: "POST",
                              token,
                              body: {
                                rpe: parsedRpe,
                                soreness: parsedSoreness,
                                fatigue: parsedFatigue,
                                notes: checkinNotes.trim() || null,
                              },
                            }
                          );
                          setCheckinSaved(true);
                          setItem((prev) => (prev ? { ...prev, completed: true } : prev));
                          setTimeout(() => setShowCompleteModal(false), 800);
                          setRpe("");
                          setSoreness("");
                          setFatigue("");
                          setCheckinNotes("");
                        } catch (err: any) {
                          setCheckinError(err?.message ?? "Failed to save check-in.");
                        } finally {
                          setIsSubmittingCheckin(false);
                        }
                      }}
                      disabled={isSubmittingCheckin}
                      className={`mt-1 rounded-2xl px-4 py-4 flex-row items-center justify-center gap-2 ${
                        isSubmittingCheckin ? "opacity-70" : ""
                      }`}
                      style={{ backgroundColor: colors.accent }}
                    >
                      {isSubmittingCheckin ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Feather name="save" size={18} color="#ffffff" />
                      )}
                      <Text className="text-white font-outfit font-bold text-sm uppercase tracking-[1.3px]">
                        {isSubmittingCheckin ? "Saving…" : "Save Check-in"}
                      </Text>
                    </Pressable>
                  </View>
                </KeyboardAwareScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeMaskedView>
    </SafeAreaView>
  );
}

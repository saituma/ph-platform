import React, { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, Linking, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  useLocalSearchParams,
  useRouter,
  type RelativePathString,
} from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";

import { canAccessTier } from "@/lib/planAccess";
import { useAgeExperience } from "@/context/AgeExperienceContext";

import { useContentDetail } from "@/hooks/programs/useContentDetail";
import { ContentHeader } from "@/components/programs/content-detail/ContentHeader";
import { ExerciseOverview } from "@/components/programs/content-detail/ExerciseOverview";
import { CoachingSection } from "@/components/programs/content-detail/CoachingSection";
import { CheckinModal } from "@/components/programs/content-detail/CheckinModal";
import { NavigationFooter } from "@/components/programs/content-detail/NavigationFooter";

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

const ExternalLinkButton = React.memo(function ExternalLinkButton({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const { isDark } = useAppTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      className="rounded-2xl bg-white/10 px-5 py-4 flex-row items-center gap-3"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <Feather name="external-link" size={18} color="#FFFFFF" />
      <View className="flex-1">
        <Text className="text-sm font-outfit text-white font-semibold">
          {label}
        </Text>
        <Text
          className="text-[11px] font-outfit text-white/80 mt-0.5"
          numberOfLines={1}
        >
          {url}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color="#94A3B8" />
    </Pressable>
  );
});

const MediaSection = React.memo(function MediaSection({
  url,
  title,
}: {
  url: string;
  title?: string;
}) {
  if (isYoutubeUrl(url)) {
    return (
      <View className="rounded-3xl overflow-hidden bg-white/5">
        <VideoPlayer uri={url} title={title} ignoreTabFocus />
      </View>
    );
  }
  if (url.toLowerCase().includes("drive.google.com")) {
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

export default function ProgramContentDetailScreen() {
  const { contentId, sharedBoundTag, exerciseDetail, sessionIds, index } =
    useLocalSearchParams<{
      contentId: string;
      sharedBoundTag?: string;
      exerciseDetail?: string;
      sessionIds?: string;
      index?: string;
    }>();
  const router = useRouter();
  const { token, programTier, athleteUserId, managedAthletes, appRole } = useAppSelector(
    (state) => state.user,
  );
  const { isDark, colors } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { isSectionHidden } = useAgeExperience();

  /**
   * Youth users should land on the Home tab on cold start.
   * If this deep program route becomes the root screen (no back stack), redirect to Home.
   */
  useEffect(() => {
    const role = String(appRole ?? "");
    const isYouth = role === "youth_athlete" || role.startsWith("youth_athlete_");
    if (!isYouth) return;
    if (router.canGoBack()) return;
    router.replace("/" as any);
  }, [appRole, router]);

  const {
    item,
    isLoading,
    error,
    load,
    showCompleteModal,
    setShowCompleteModal,
    form,
    submitCheckin,
  } = useContentDetail(token, contentId);

  const isExerciseDetail = exerciseDetail === "1" || exerciseDetail === "true";
  const activeAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return (
      managedAthletes.find(
        (a) => a.id === athleteUserId || a.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [athleteUserId, managedAthletes]);

  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(255,255,255,0.84)";
  const accentSurface = isDark
    ? "rgba(34,197,94,0.16)"
    : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const sessionExerciseIds = useMemo(
    () =>
      String(sessionIds ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [sessionIds],
  );
  const sessionIndex = useMemo(() => {
    const parsed = Number(index);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [index]);

  const hasSessionNavigation =
    isExerciseDetail && sessionExerciseIds.length > 1;
  const previousExerciseId =
    hasSessionNavigation && sessionIndex > 0
      ? (sessionExerciseIds[sessionIndex - 1] ?? null)
      : null;
  const nextExerciseId =
    hasSessionNavigation && sessionIndex < sessionExerciseIds.length - 1
      ? (sessionExerciseIds[sessionIndex + 1] ?? null)
      : null;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/programs");
    }
  }, [router]);

  const buildExercisePath = (targetId: string, targetIndex: number) =>
    `/programs/content/${targetId}?exerciseDetail=1&sessionIds=${encodeURIComponent(
      sessionExerciseIds.join(","),
    )}&index=${targetIndex}` as RelativePathString;

  const contentBody = useMemo(() => {
    if (!item?.body) return null;
    return (
      <MarkdownText
        text={item.body}
        baseStyle={{ fontSize: 15, lineHeight: 24, color: colors.text }}
        headingStyle={{
          fontSize: 18,
          lineHeight: 26,
          color: colors.text,
          fontWeight: "700",
        }}
        subheadingStyle={{
          fontSize: 16,
          lineHeight: 24,
          color: colors.text,
          fontWeight: "700",
        }}
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
          contentContainerStyle={{
            paddingBottom: hasSessionNavigation ? 136 : 40,
          }}
        >
          <View className="px-6 pt-6">
            <ContentHeader
              title={item?.title ?? "Program Content"}
              isExerciseDetail={isExerciseDetail}
              athleteName={activeAthlete?.name}
              athleteAge={activeAthlete?.age}
              category={item?.metadata?.category}
              sharedBoundTag={sharedBoundTag}
              onBack={handleBack}
              colors={colors}
              isDark={isDark}
              surfaceColor={surfaceColor}
              mutedSurface={mutedSurface}
              accentSurface={accentSurface}
              borderSoft={borderSoft}
            />

            {isLoading ? (
              <View
                className="rounded-3xl bg-[#2F8F57] px-6 py-6 items-center"
                style={isDark ? Shadows.none : Shadows.sm}
              >
                <ActivityIndicator color="#FFFFFF" />
                <Text className="text-sm font-outfit text-white mt-2">
                  Loading content...
                </Text>
              </View>
            ) : error ? (
              <View
                className="rounded-3xl bg-[#2F8F57] px-6 py-6"
                style={isDark ? Shadows.none : Shadows.sm}
              >
                <Text className="text-sm font-outfit text-white text-center">
                  {error}
                </Text>
              </View>
            ) : item ? (
              <View className="gap-4">
                <ExerciseOverview
                  isExerciseDetail={isExerciseDetail}
                  hasExercise={
                    !!(
                      item.metadata?.sets ||
                      item.metadata?.reps ||
                      item.metadata?.duration ||
                      item.metadata?.restSeconds
                    )
                  }
                  meta={item.metadata ?? {}}
                  contentBody={contentBody}
                  canLogCompletion={true}
                  onMarkComplete={() => setShowCompleteModal(true)}
                  colors={colors}
                  isDark={isDark}
                  surfaceColor={surfaceColor}
                  mutedSurface={mutedSurface}
                  accentSurface={accentSurface}
                />

                <CoachingSection meta={item.metadata ?? {}} />

                {mediaSection}
              </View>
            ) : null}
          </View>
        </ThemedScrollView>

        {hasSessionNavigation && (
          <NavigationFooter
            previousExerciseId={previousExerciseId}
            nextExerciseId={nextExerciseId}
            onPrevious={() => {
              if (previousExerciseId) {
                router.replace(
                  buildExercisePath(previousExerciseId, sessionIndex - 1),
                );
              }
            }}
            onNext={() => {
              if (nextExerciseId) {
                router.replace(
                  buildExercisePath(nextExerciseId, sessionIndex + 1),
                );
              } else {
                handleBack();
              }
            }}
            colors={colors}
            isDark={isDark}
            surfaceColor={surfaceColor}
            mutedSurface={mutedSurface}
            borderSoft={borderSoft}
          />
        )}

        {/* Video upload is handled in the Session detail exercise cards to keep everything in one place. */}

        <CheckinModal
          isVisible={showCompleteModal}
          onClose={() => !form.isSubmitting && setShowCompleteModal(false)}
          onSubmit={submitCheckin}
          form={form}
          colors={colors}
          isDark={isDark}
          surfaceColor={surfaceColor}
          mutedSurface={mutedSurface}
          borderSoft={borderSoft}
          insetsBottom={insets.bottom}
        />
      </SafeMaskedView>
    </SafeAreaView>
  );
}

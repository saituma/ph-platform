import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";

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

type PremiumExerciseDetail = {
  id: number;
  order: number;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  coachingNotes?: string | null;
  progressionNotes?: string | null;
  regressionNotes?: string | null;
  completed?: boolean;
  exercise?: {
    id: number;
    name: string;
    category?: string | null;
    cues?: string | null;
    howTo?: string | null;
    progression?: string | null;
    regression?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: number | null;
    restSeconds?: number | null;
    notes?: string | null;
    videoUrl?: string | null;
  } | null;
  session?: {
    id: number;
    weekNumber?: number | null;
    sessionNumber?: number | null;
    title?: string | null;
    notes?: string | null;
  } | null;
  linkedProgramSectionContentId?: number | null;
  linkedProgramSectionContent?: {
    id: number;
    title?: string | null;
    body?: string | null;
    allowVideoUpload?: boolean | null;
    videoUrl?: string | null;
    metadata?: ExerciseMetadata | null;
  } | null;
};

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

const ExternalLinkButton = React.memo(function ExternalLinkButton({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const { isDark } = useAppTheme();
  return (
    <TouchableOpacity
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
    </TouchableOpacity>
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

  if (isGoogleDriveUrl(url)) {
    return <ExternalLinkButton url={url} label="Open in Google Drive" />;
  }

  if (isExternalVideoUrl(url)) {
    return <ExternalLinkButton url={url} label="Open Video" />;
  }

  return (
    <View className="rounded-3xl overflow-hidden bg-white/5">
      <VideoPlayer uri={url} title={title} ignoreTabFocus />
    </View>
  );
});

export default function PremiumExerciseDetailScreen() {
  const { planExerciseId, sessionIds, index } = useLocalSearchParams<{
    planExerciseId: string;
    sessionIds?: string;
    index?: string;
  }>();
  const router = useRouter();
  const { token, managedAthletes, athleteUserId, programTier, appRole } = useAppSelector(
    (state) => state.user,
  );

  const { isDark, colors } = useAppTheme();
  const { isSectionHidden } = useAgeExperience();
  const [item, setItem] = useState<PremiumExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);
  const lastLoadedRef = useRef<string | null>(null);

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
        if (url && url.includes("/programs/exercise/")) return;
        router.replace("/(tabs)");
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (!token || !planExerciseId) {
        setIsLoading(false);
        setError("Exercise not available.");
        return;
      }
      const key = `${token}:${planExerciseId}`;
      if (!force && lastLoadedRef.current === key) return;
      try {
        setIsLoading(true);
        const data = await apiRequest<{ item?: PremiumExerciseDetail }>(
          `/premium-plan/exercises/${planExerciseId}`,
          {
            token,
            forceRefresh: force,
            skipCache: true,
          },
        );
        if (!data.item) {
          setError("Exercise not found.");
          setItem(null);
          return;
        }
        setItem(data.item);
        setError(null);
        lastLoadedRef.current = key;
      } catch (err: any) {
        setError(err?.message ?? "Failed to load exercise.");
        setItem(null);
      } finally {
        setIsLoading(false);
      }
    },
    [planExerciseId, token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const activeAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return (
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [athleteUserId, managedAthletes]);

  const linkedContent = item?.linkedProgramSectionContent ?? null;
  const meta = (linkedContent?.metadata ?? {}) as ExerciseMetadata;
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(255,255,255,0.84)";
  const accentSurface = isDark
    ? "rgba(34,197,94,0.16)"
    : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedSurfaceSoft = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(15,23,42,0.04)";
  const title = item?.exercise?.name ?? linkedContent?.title ?? "Exercise";
  const mediaUrl = linkedContent?.videoUrl ?? item?.exercise?.videoUrl ?? null;
  const bodyText =
    linkedContent?.body ??
    item?.exercise?.howTo ??
    item?.exercise?.notes ??
    item?.coachingNotes ??
    "";
  const displaySets = item?.sets ?? null;
  const displayReps = item?.reps ?? null;
  const displayDuration = item?.duration ?? null;
  const displayRest = item?.restSeconds ?? null;
  const cues = meta.cues ?? item?.exercise?.cues ?? null;
  const progression =
    item?.progressionNotes ??
    meta.progression ??
    item?.exercise?.progression ??
    null;
  const regression =
    item?.regressionNotes ??
    meta.regression ??
    item?.exercise?.regression ??
    null;
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
  const hasSessionNavigation = sessionExerciseIds.length > 1;
  const previousExerciseId =
    hasSessionNavigation && sessionIndex > 0
      ? (sessionExerciseIds[sessionIndex - 1] ?? null)
      : null;
  const nextExerciseId =
    hasSessionNavigation && sessionIndex < sessionExerciseIds.length - 1
      ? (sessionExerciseIds[sessionIndex + 1] ?? null)
      : null;
  const buildExercisePath = useCallback(
    (targetId: string, targetIndex: number) =>
      `/programs/exercise/${targetId}?sessionIds=${encodeURIComponent(sessionExerciseIds.join(","))}&index=${targetIndex}` as RelativePathString,
    [sessionExerciseIds],
  );
  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: hasSessionNavigation ? 136 : 40 }),
    [hasSessionNavigation],
  );

  const DetailCard = useCallback(
    ({
      icon,
      title,
      body,
    }: {
      icon: React.ComponentProps<typeof Feather>["name"];
      title: string;
      body: string;
    }) => (
      <View
        className="rounded-[28px] border px-6 py-5 gap-3"
        style={{
          backgroundColor: surfaceColor,
          borderColor: borderSoft,
          ...(isDark ? Shadows.none : Shadows.sm),
        }}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="h-9 w-9 rounded-full items-center justify-center"
            style={{ backgroundColor: mutedSurfaceSoft }}
          >
            <Feather name={icon} size={16} color={colors.accent} />
          </View>
          <Text
            className="text-[12px] font-outfit uppercase tracking-[1.6px] font-bold"
            style={{ color: colors.textSecondary }}
          >
            {title}
          </Text>
        </View>

        <MarkdownText
          text={body}
          baseStyle={{ fontSize: 15, lineHeight: 24, color: colors.text }}
          headingStyle={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.text,
            fontWeight: "700",
          }}
          subheadingStyle={{
            fontSize: 15,
            lineHeight: 22,
            color: colors.text,
            fontWeight: "700",
          }}
          listItemStyle={{ paddingLeft: 6 }}
        />
      </View>
    ),
    [
      borderSoft,
      colors.accent,
      colors.text,
      colors.textSecondary,
      isDark,
      mutedSurfaceSoft,
      surfaceColor,
    ],
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/programs");
  }, [router]);

  const toggleComplete = useCallback(async () => {
    if (!token || !item || isTogglingComplete) return;
    const nextCompleted = !item.completed;
    setIsTogglingComplete(true);
    setItem((prev) => (prev ? { ...prev, completed: nextCompleted } : prev));
    try {
      await apiRequest(`/premium-plan/exercises/${item.id}/complete`, {
        method: nextCompleted ? "POST" : "DELETE",
        token,
      });
    } catch {
      setItem((prev) => (prev ? { ...prev, completed: !nextCompleted } : prev));
    } finally {
      setIsTogglingComplete(false);
    }
  }, [isTogglingComplete, item, token]);

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <SafeMaskedView style={{ flex: 1 }}>
        <ThemedScrollView
          onRefresh={() => load(true)}
          contentContainerStyle={contentContainerStyle}
        >
          <View className="px-6 pt-6">
            <View
              className="overflow-hidden rounded-[30px] border px-5 py-5 mb-6"
              style={{
                backgroundColor: surfaceColor,
                borderColor: borderSoft,
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <View
                className="absolute -right-10 -top-8 h-28 w-28 rounded-full"
                style={{ backgroundColor: accentSurface }}
              />
              <View className="flex-row items-center justify-between mb-4">
                <Pressable
                  onPress={handleBack}
                  className="h-11 w-11 items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Feather name="arrow-left" size={20} color={colors.accent} />
                </Pressable>
                <View
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Text
                    className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]"
                    style={{ color: colors.accent }}
                  >
                    Exercise detail
                  </Text>
                </View>
              </View>

              <Text className="text-3xl font-telma-bold text-app font-bold">
                {title}
              </Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {activeAthlete?.name ? (
                  <View
                    className="rounded-full px-3 py-2"
                    style={{ backgroundColor: accentSurface }}
                  >
                    <Text
                      className="text-[11px] font-outfit font-semibold uppercase tracking-[1.2px]"
                      style={{ color: colors.accent }}
                    >
                      Athlete: {activeAthlete.name}
                    </Text>
                  </View>
                ) : null}
                {item?.session?.weekNumber != null ? (
                  <View
                    className="rounded-full px-3 py-2"
                    style={{ backgroundColor: mutedSurface }}
                  >
                    <Text
                      className="text-[11px] font-outfit font-semibold"
                      style={{ color: colors.text }}
                    >
                      Week {item.session.weekNumber}
                    </Text>
                  </View>
                ) : null}
                {item?.session?.sessionNumber != null ? (
                  <View
                    className="rounded-full px-3 py-2"
                    style={{ backgroundColor: mutedSurface }}
                  >
                    <Text
                      className="text-[11px] font-outfit font-semibold"
                      style={{ color: colors.text }}
                    >
                      Session {item.session.sessionNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {isLoading ? (
              <View
                className="rounded-3xl bg-[#2F8F57] px-6 py-6 items-center"
                style={isDark ? Shadows.none : Shadows.sm}
              >
                <ActivityIndicator color="#FFFFFF" />
                <Text className="text-sm font-outfit text-white mt-2">
                  Loading exercise...
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
                <View
                  className="rounded-[28px] px-6 py-6 gap-4"
                  style={{
                    backgroundColor: surfaceColor,
                    ...(isDark ? Shadows.none : Shadows.sm),
                  }}
                >
                  <Text className="text-2xl font-clash text-app font-bold">
                    Exercise overview
                  </Text>

                  <ProgramMetricGrid
                    items={[
                      displaySets != null
                        ? {
                            key: "sets",
                            label: "Sets",
                            value: String(displaySets),
                            icon: "hash",
                            accent: true,
                          }
                        : null,
                      displayReps != null
                        ? {
                            key: "reps",
                            label: "Reps",
                            value: String(displayReps),
                            icon: "repeat",
                          }
                        : null,
                      displayDuration != null
                        ? {
                            key: "duration",
                            label: "Duration",
                            value: String(displayDuration),
                            unit: "s",
                            icon: "clock",
                          }
                        : null,
                      displayRest != null
                        ? {
                            key: "rest",
                            label: "Rest",
                            value: String(displayRest),
                            unit: "s",
                            icon: "pause-circle",
                          }
                        : null,
                      (meta.category ?? item.exercise?.category)
                        ? {
                            key: "category",
                            label: "Category",
                            value: String(meta.category ?? item.exercise?.category),
                            icon: "tag",
                            valueKind: "text" as const,
                          }
                        : null,
                      meta.equipment
                        ? {
                            key: "equipment",
                            label: "Equipment",
                            value: String(meta.equipment),
                            icon: "tool",
                            valueKind: "text" as const,
                          }
                        : null,
                    ].filter(Boolean) as any}
                  />

                  {bodyText ? (
                    <MarkdownText
                      text={bodyText}
                      baseStyle={{
                        fontSize: 15,
                        lineHeight: 24,
                        color: colors.text,
                      }}
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
                  ) : null}

                  <Pressable
                    onPress={() => {
                      void toggleComplete();
                    }}
                    className="mt-4 rounded-2xl px-4 py-4 flex-row items-center justify-center gap-2"
                    style={{
                      backgroundColor: item.completed
                        ? colors.text
                        : colors.accent,
                    }}
                  >
                    <Feather
                      name={item.completed ? "rotate-ccw" : "check-circle"}
                      size={18}
                      color="#ffffff"
                    />
                    <Text className="text-white font-outfit font-bold text-sm uppercase tracking-[1.3px]">
                      {item.completed
                        ? "Mark incomplete"
                        : "Mark exercise complete"}
                    </Text>
                  </Pressable>
                </View>

                {cues ? (
                  <DetailCard
                    icon="message-circle"
                    title="Coaching cues"
                    body={cues}
                  />
                ) : null}

                {meta.steps ? (
                  <DetailCard icon="list" title="Steps" body={meta.steps} />
                ) : null}

                {progression ? (
                  <DetailCard
                    icon="trending-up"
                    title="Progression"
                    body={progression}
                  />
                ) : null}

                {regression ? (
                  <DetailCard
                    icon="trending-down"
                    title="Regression"
                    body={regression}
                  />
                ) : null}

                {mediaUrl ? (
                  <MediaSection url={mediaUrl} title={title} />
                ) : null}
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
                router.replace(
                  buildExercisePath(previousExerciseId, sessionIndex - 1),
                );
              }}
              disabled={!previousExerciseId}
              className={`flex-1 rounded-2xl px-4 py-4 items-center justify-center ${previousExerciseId ? "" : "opacity-50"}`}
              style={{ backgroundColor: mutedSurface }}
            >
              <Text
                className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px]"
                style={{ color: colors.text }}
              >
                Previous
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (nextExerciseId) {
                  router.replace(
                    buildExercisePath(nextExerciseId, sessionIndex + 1),
                  );
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

        {/* Video upload is handled in the Session detail exercise cards to keep everything in one place. */}
      </SafeMaskedView>
    </SafeAreaView>
  );
}

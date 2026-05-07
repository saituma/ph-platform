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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useLocalSearchParams,
  useRouter,
  type RelativePathString,
} from "expo-router";
import {
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  RotateCcw,
  MessageCircle,
  List,
  TrendingUp,
  TrendingDown,
  Hash,
  Repeat,
  Clock,
  PauseCircle,
  Tag,
  Wrench,
} from "lucide-react-native";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useAdminPastel } from "@/components/admin/AdminUI";
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
  p,
}: {
  url: string;
  label: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      style={{
        borderRadius: 22, backgroundColor: p.cardWhite, paddingHorizontal: 20, paddingVertical: 16,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}
    >
      <ExternalLink size={18} color={p.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
          {label}
        </Text>
        <Text
          style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 2 }}
          numberOfLines={1}
        >
          {url}
        </Text>
      </View>
      <ChevronRight size={16} color={p.textMuted} />
    </Pressable>
  );
});

const MediaSection = React.memo(function MediaSection({
  url,
  title,
  p,
}: {
  url: string;
  title?: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  if (isYoutubeUrl(url)) {
    return (
      <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: p.inputBg }}>
        <VideoPlayer uri={url} title={title} ignoreTabFocus />
      </View>
    );
  }

  if (isGoogleDriveUrl(url)) {
    return <ExternalLinkButton url={url} label="Open in Google Drive" p={p} />;
  }

  if (isExternalVideoUrl(url)) {
    return <ExternalLinkButton url={url} label="Open Video" p={p} />;
  }

  return (
    <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: p.inputBg }}>
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

  const p = useAdminPastel();
  const { isSectionHidden } = useAgeExperience();
  const [item, setItem] = useState<PremiumExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);
  const lastLoadedRef = useRef<string | null>(null);

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
      Icon,
      title,
      body,
    }: {
      Icon: any;
      title: string;
      body: string;
    }) => (
      <View
        style={{
          borderRadius: 22, paddingHorizontal: 24, paddingVertical: 20, gap: 12,
          backgroundColor: p.cardWhite,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              height: 36, width: 36, borderRadius: 100, alignItems: "center", justifyContent: "center",
              backgroundColor: p.accentSoft,
            }}
          >
            <Icon size={16} color={p.accent} />
          </View>
          <Text
            style={{ fontSize: 12, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.6, color: p.textSecondary }}
          >
            {title}
          </Text>
        </View>

        <MarkdownText
          text={body}
          baseStyle={{ fontSize: 15, lineHeight: 24, color: p.textPrimary }}
          headingStyle={{
            fontSize: 16,
            lineHeight: 24,
            color: p.textPrimary,
            fontWeight: "700",
          }}
          subheadingStyle={{
            fontSize: 15,
            lineHeight: 22,
            color: p.textPrimary,
            fontWeight: "700",
          }}
          listItemStyle={{ paddingLeft: 6 }}
        />
      </View>
    ),
    [p],
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
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <SafeMaskedView style={{ flex: 1 }}>
        <ThemedScrollView
          onRefresh={() => load(true)}
          contentContainerStyle={contentContainerStyle}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            {/* Hero header */}
            <View
              style={{
                overflow: "hidden", borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                marginBottom: 24, backgroundColor: p.cardWhite,
              }}
            >
              <View
                style={{
                  position: "absolute", right: -40, top: -32, height: 112, width: 112,
                  borderRadius: 56, backgroundColor: p.accentSoft,
                }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Pressable
                  onPress={handleBack}
                  style={{
                    height: 44, width: 44, alignItems: "center", justifyContent: "center",
                    borderRadius: 18, backgroundColor: p.inputBg,
                  }}
                >
                  <ArrowLeft size={20} color={p.accent} />
                </Pressable>
                <View
                  style={{
                    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6,
                    backgroundColor: p.inputBg,
                  }}
                >
                  <Text
                    style={{ fontSize: 10, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.3, color: p.accent }}
                  >
                    Exercise detail
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                {title}
              </Text>
              <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {activeAthlete?.name ? (
                  <View
                    style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: p.accentSoft }}
                  >
                    <Text
                      style={{ fontSize: 11, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.2, color: p.accent }}
                    >
                      Athlete: {activeAthlete.name}
                    </Text>
                  </View>
                ) : null}
                {item?.session?.weekNumber != null ? (
                  <View
                    style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: p.inputBg }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                      Week {item.session.weekNumber}
                    </Text>
                  </View>
                ) : null}
                {item?.session?.sessionNumber != null ? (
                  <View
                    style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: p.inputBg }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                      Session {item.session.sessionNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {isLoading ? (
              <View
                style={{
                  borderRadius: 22, backgroundColor: p.accent, paddingHorizontal: 24, paddingVertical: 24, alignItems: "center",
                }}
              >
                <ActivityIndicator color={p.buttonPrimaryText} />
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.buttonPrimaryText, marginTop: 8 }}>
                  Loading exercise...
                </Text>
              </View>
            ) : error ? (
              <View
                style={{
                  borderRadius: 22, backgroundColor: p.accent, paddingHorizontal: 24, paddingVertical: 24,
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.buttonPrimaryText, textAlign: "center" }}>
                  {error}
                </Text>
              </View>
            ) : item ? (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    borderRadius: 22, paddingHorizontal: 24, paddingVertical: 24, gap: 16,
                    backgroundColor: p.cardWhite,
                  }}
                >
                  <Text style={{ fontSize: 24, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
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
                        color: p.textPrimary,
                      }}
                      headingStyle={{
                        fontSize: 18,
                        lineHeight: 26,
                        color: p.textPrimary,
                        fontWeight: "700",
                      }}
                      subheadingStyle={{
                        fontSize: 16,
                        lineHeight: 24,
                        color: p.textPrimary,
                        fontWeight: "700",
                      }}
                      listItemStyle={{ paddingLeft: 6 }}
                    />
                  ) : null}

                  <Pressable
                    onPress={() => {
                      void toggleComplete();
                    }}
                    style={{
                      marginTop: 16, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 16,
                      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                      backgroundColor: item.completed ? p.textPrimary : p.accent,
                    }}
                  >
                    {item.completed ? (
                      <RotateCcw size={18} color={p.buttonPrimaryText} />
                    ) : (
                      <CheckCircle size={18} color={p.buttonPrimaryText} />
                    )}
                    <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 14, textTransform: "uppercase", letterSpacing: 1.3 }}>
                      {item.completed
                        ? "Mark incomplete"
                        : "Mark exercise complete"}
                    </Text>
                  </Pressable>
                </View>

                {cues ? (
                  <DetailCard
                    Icon={MessageCircle}
                    title="Coaching cues"
                    body={cues}
                  />
                ) : null}

                {meta.steps ? (
                  <DetailCard Icon={List} title="Steps" body={meta.steps} />
                ) : null}

                {progression ? (
                  <DetailCard
                    Icon={TrendingUp}
                    title="Progression"
                    body={progression}
                  />
                ) : null}

                {regression ? (
                  <DetailCard
                    Icon={TrendingDown}
                    title="Regression"
                    body={regression}
                  />
                ) : null}

                {mediaUrl ? (
                  <MediaSection url={mediaUrl} title={title} p={p} />
                ) : null}
              </View>
            ) : null}
          </View>
        </ThemedScrollView>

        {hasSessionNavigation ? (
          <View
            style={{
              position: "absolute", left: 24, right: 24, bottom: 20,
              flexDirection: "row", alignItems: "center", gap: 12,
              borderRadius: 22, paddingHorizontal: 16, paddingVertical: 16,
              backgroundColor: p.cardWhite,
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
              style={{
                flex: 1, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 16,
                alignItems: "center", justifyContent: "center",
                backgroundColor: p.inputBg,
                opacity: previousExerciseId ? 1 : 0.5,
              }}
            >
              <Text
                style={{ fontSize: 12, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.1, color: p.textPrimary }}
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
              style={{
                flex: 1, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 16,
                alignItems: "center", justifyContent: "center",
                backgroundColor: p.accent,
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.1, color: p.buttonPrimaryText }}>
                {nextExerciseId ? "Next" : "Finish Session"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeMaskedView>
    </SafeAreaView>
  );
}

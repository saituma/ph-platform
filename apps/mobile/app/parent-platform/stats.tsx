import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAthleteUserId, setManagedAthletes } from "@/store/slices/userSlice";
import { apiRequest } from "@/lib/api";
import { tierRank } from "@/lib/planAccess";
import { Feather } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, InteractionManager, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AthleteStatsScreen() {

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isSectionHidden } = useAgeExperience();
  const { token, programTier, managedAthletes, athleteUserId, profile } = useAppSelector(
    (state) => state.user
  );
  const athleteUserIdRef = useRef<number | null>(athleteUserId);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    summary: {
      sessionsCompleted: number;
      coachFeedback: number;
      videosReviewed: number;
    };
    weeklyLoad: number[];
    progressTrend: number[];
    feedback: {
      videoFeedbackRate: number;
      coachReplyRate: number;
      sessionCompletionRate: number;
    };
  }>({
    summary: {
      sessionsCompleted: 0,
      coachFeedback: 0,
      videosReviewed: 0,
    },
    weeklyLoad: [],
    progressTrend: [],
    feedback: {
      videoFeedbackRate: 0,
      coachReplyRate: 0,
      sessionCompletionRate: 0,
    },
  });

  const hasPremiumAccess = tierRank(programTier) >= tierRank("PHP_Premium");

  const loadAthletes = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{
        guardian?: { activeAthleteId?: number | null } | null;
        athletes?: {
          id?: number;
          userId?: number | null;
          name?: string | null;
          age?: number | null;
          team?: string | null;
          level?: string | null;
          trainingPerWeek?: number | null;
          profilePicture?: string | null;
        }[];
      }>("/onboarding/athletes", { token });
      const athleteList = data.athletes ?? [];
      dispatch(setManagedAthletes(athleteList));
      const hasSelection = athleteList.some(
        (athlete) =>
          athlete.id === athleteUserIdRef.current ||
          athlete.userId === athleteUserIdRef.current
      );
      if (!athleteUserIdRef.current || !hasSelection) {
        const activeAthlete =
          athleteList.find((item) => item.id === data.guardian?.activeAthleteId) ??
          athleteList[0] ??
          null;
        if (activeAthlete?.userId || activeAthlete?.id) {
          dispatch(setAthleteUserId(activeAthlete.userId ?? activeAthlete.id ?? null));
        }
      }
    } catch {
      dispatch(setManagedAthletes([]));
    } finally {
      setIsLoading(false);
    }
  }, [athleteUserId, dispatch, token]);

  useEffect(() => {
    athleteUserIdRef.current = athleteUserId;
  }, [athleteUserId]);





  const selectedAthlete =
    managedAthletes.find(
      (athlete) => athlete.id === athleteUserId || athlete.userId === athleteUserId
    ) ?? managedAthletes[0] ?? null;

  const summaryStats = useMemo(() => {
    return [
      { label: "Training Days", value: selectedAthlete?.trainingPerWeek ?? "—" },
      { label: "Sessions Completed", value: stats.summary.sessionsCompleted },
      { label: "Coach Feedback", value: stats.summary.coachFeedback },
      { label: "Videos Reviewed", value: stats.summary.videosReviewed },
    ];
  }, [selectedAthlete?.trainingPerWeek, stats.summary]);

  const loadStats = useCallback(async () => {
    if (!token || !selectedAthlete) return;
    setIsStatsLoading(true);
    setStatsError(null);

    const now = new Date();
    const toDate = (value?: string | Date | null) => {
      if (!value) return null;
      const parsed = typeof value === "string" ? new Date(value) : value;
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const startOfWeek = (value: Date) => {
      const date = new Date(value);
      const day = date.getDay();
      const diff = (day + 6) % 7;
      date.setDate(date.getDate() - diff);
      date.setHours(0, 0, 0, 0);
      return date;
    };
    const currentWeekStart = startOfWeek(now);
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const buildWeekBuckets = (count: number) => {
      return Array.from({ length: count }).map((_, idx) => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() - (count - 1 - idx) * 7);
        return date;
      });
    };
    const weekStarts = buildWeekBuckets(6);
    const loadWeekStarts = buildWeekBuckets(5);
    const resolveWeekIndex = (value: Date, buckets: Date[]) => {
      const weekStart = startOfWeek(value);
      const diff = currentWeekStart.getTime() - weekStart.getTime();
      const indexFromCurrent = Math.floor(diff / weekMs);
      const idx = buckets.length - 1 - indexFromCurrent;
      return idx >= 0 && idx < buckets.length ? idx : null;
    };

    try {
      if (selectedAthlete.id) {
        await apiRequest("/onboarding/select-athlete", {
          token,
          body: { athleteId: selectedAthlete.id },
        });
      }

      const [bookingsData, videosData, messagesData] = await Promise.all([
        apiRequest<{ items: any[] }>("/bookings", { token }),
        apiRequest<{ items: any[] }>("/videos", { token }),
        apiRequest<{ messages: any[]; coach?: { id?: number } }>("/messages", { token }),
      ]);

      const bookings = bookingsData.items ?? [];
      const videos = videosData.items ?? [];
      const messages = messagesData.messages ?? [];
      const coachId = messagesData.coach?.id ?? null;

      const bookingsForAthlete = selectedAthlete.id
        ? bookings.filter((item) => item.athleteId === selectedAthlete.id)
        : bookings;
      const totalBookings = bookingsForAthlete.length;
      const completedBookings = bookingsForAthlete.filter((item) => {
        const startsAt = toDate(item.startsAt);
        return startsAt ? startsAt.getTime() <= now.getTime() : false;
      });

      const reviewedVideos = videos.filter((item) => Boolean(item.feedback)).length;
      const totalVideos = videos.length;

      const guardianUserId = Number(profile.id);
      const hasGuardianId = Number.isFinite(guardianUserId);
      const coachMessages = hasGuardianId
        ? messages.filter((msg) => msg.senderId && msg.senderId !== guardianUserId).length
        : coachId
          ? messages.filter((msg) => msg.senderId === coachId).length
          : messages.filter((msg) => Boolean(msg.senderId)).length;
      const totalMessages = messages.length;

      const weeklyLoadCounts = new Array(loadWeekStarts.length).fill(0);
      const progressCounts = new Array(weekStarts.length).fill(0);

      bookingsForAthlete.forEach((item) => {
        const startsAt = toDate(item.startsAt);
        if (!startsAt) return;
        const loadIndex = resolveWeekIndex(startsAt, loadWeekStarts);
        if (loadIndex !== null) weeklyLoadCounts[loadIndex] += 1;
        const progressIndex = resolveWeekIndex(startsAt, weekStarts);
        if (progressIndex !== null) progressCounts[progressIndex] += 1;
      });

      videos.forEach((item) => {
        const createdAt = toDate(item.createdAt);
        if (!createdAt) return;
        const progressIndex = resolveWeekIndex(createdAt, weekStarts);
        if (progressIndex !== null) progressCounts[progressIndex] += 1;
      });

      messages.forEach((item) => {
        const createdAt = toDate(item.createdAt);
        if (!createdAt) return;
        const progressIndex = resolveWeekIndex(createdAt, weekStarts);
        if (progressIndex !== null) progressCounts[progressIndex] += 1;
      });

      const expectedPerWeek = Math.max(1, selectedAthlete.trainingPerWeek ?? 0);
      const weeklyLoad = weeklyLoadCounts.map((count) =>
        Math.min(100, Math.round((count / expectedPerWeek) * 100))
      );

      const maxProgress = Math.max(1, ...progressCounts);
      const progressTrend = progressCounts.map((count) =>
        Math.min(100, Math.round((count / maxProgress) * 100))
      );

      setStats({
        summary: {
          sessionsCompleted: completedBookings.length,
          coachFeedback: coachMessages,
          videosReviewed: reviewedVideos,
        },
        weeklyLoad,
        progressTrend,
        feedback: {
          videoFeedbackRate: totalVideos ? Math.round((reviewedVideos / totalVideos) * 100) : 0,
          coachReplyRate: totalMessages ? Math.round((coachMessages / totalMessages) * 100) : 0,
          sessionCompletionRate: totalBookings
            ? Math.round((completedBookings.length / totalBookings) * 100)
            : 0,
        },
      });
    } catch (err: any) {
      setStatsError(err?.message ?? "Failed to load athlete stats.");
    } finally {
      setIsStatsLoading(false);
    }
  }, [selectedAthlete, token]);

  useEffect(() => {
    let mounted = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!mounted) return;
      void loadAthletes();
    });
    return () => {
      mounted = false;
      task?.cancel?.();
    };
  }, [loadAthletes]);

  useEffect(() => {
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!active) return;
      void loadStats();
    });
    return () => {
      active = false;
      task?.cancel?.();
    };
  }, [loadStats]);

  if (isSectionHidden("parentPlatform")) {
    return (
      <AgeGate
        title="Athlete stats locked"
        message="Athlete analytics are restricted for this age."
      />
    );
  }



  if (!hasPremiumAccess) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <ThemedScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
          <View className="mb-6">
            <Text className="text-3xl font-telma-bold text-app mb-2">Athlete Stats</Text>
            <Text className="text-base font-outfit text-secondary leading-relaxed">
              Upgrade to PHP Premium to unlock the analytics dashboard.
            </Text>
          </View>
          <View className="rounded-3xl border border-app/10 bg-secondary/10 p-5">
            <View className="flex-row items-center gap-2 mb-2">
              <Feather name="lock" size={16} className="text-secondary" />
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.4px]">
                Premium Only
              </Text>
            </View>
            <Text className="text-lg font-clash text-app mb-2">
              Unlock athlete analytics
            </Text>
            <Text className="text-base font-outfit text-secondary leading-relaxed">
              Performance charts, progress tracking, and feedback summaries are available on PHP Premium.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/plans")}
              className="mt-4 rounded-full bg-accent px-4 py-3"
            >
              <Text className="text-white text-sm font-outfit text-center">View Plans</Text>
            </TouchableOpacity>
          </View>
        </ThemedScrollView>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.replace("/parent-platform")}
            className="h-10 w-10 items-center justify-center bg-secondary rounded-2xl"
          >
            <Feather name="arrow-left" size={20} className="text-secondary" />
          </TouchableOpacity>
          <Text className="text-2xl font-clash text-app font-bold">Athlete Stats</Text>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((row) => (
              <View key={row} className="rounded-3xl border border-app/10 bg-input px-4 py-3">
                <View className="h-4 w-32 rounded-full bg-secondary/20" />
                <View className="h-3 w-full rounded-full bg-secondary/20 mt-2" />
              </View>
            ))}
          </View>
        ) : (
          <>
            <View className="rounded-3xl border border-app/10 bg-input p-5 mb-6">
              <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.4px]">
                Selected Athlete
              </Text>
              <View className="flex-row items-center gap-3 mt-3">
                {selectedAthlete?.profilePicture ? (
                  <Image
                    source={{ uri: selectedAthlete.profilePicture }}
                    style={{ width: 56, height: 56, borderRadius: 16 }}
                  />
                ) : (
                  <View className="h-14 w-14 rounded-2xl bg-secondary/20 items-center justify-center">
                    <Feather name="user" size={20} className="text-secondary" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-xl font-clash text-app">
                    {selectedAthlete?.name ?? "Athlete"}
                  </Text>
                  <Text className="text-sm font-outfit text-secondary">
                    {selectedAthlete?.team ?? "Team not set"} • {selectedAthlete?.age ?? "—"} yrs
                  </Text>
                </View>
              </View>
              {managedAthletes.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingTop: 12 }}
                >
                  {managedAthletes.map((athlete) => {
                    const isActive = athlete.id === selectedAthlete?.id;
                    return (
                      <TouchableOpacity
                        key={athlete.id ?? athlete.name ?? Math.random()}
                        onPress={async () => {
                          if (athlete.userId || athlete.id) {
                            dispatch(setAthleteUserId(athlete.userId ?? athlete.id ?? null));
                            try {
                              await apiRequest("/onboarding/select-athlete", {
                                token,
                                body: { athleteId: athlete.id },
                              });
                            } catch {
                              // Ignore selection sync errors.
                            }
                          }
                        }}
                        className={`px-3 py-2 rounded-full border ${
                          isActive
                            ? "bg-[#2F8F57]/15 border-[#2F8F57]/30"
                            : "bg-secondary/5 border-app/10"
                        }`}
                      >
                        <Text className={`text-xs font-outfit ${
                          isActive ? "text-[#2F8F57]" : "text-secondary"
                        }`}>
                          {athlete.name ?? "Athlete"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>

            <View className="gap-4 mb-6">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px]">
                Overview
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {summaryStats.map((stat) => (
                  <View
                    key={stat.label}
                    className="w-[48%] rounded-2xl border border-app/10 bg-input px-4 py-4"
                  >
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                      {stat.label}
                    </Text>
                    <Text className="text-2xl font-clash text-app mt-2">
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {isStatsLoading ? (
              <View className="gap-3 mb-6">
                {[1, 2].map((row) => (
                  <View key={`stat-skel-${row}`} className="rounded-3xl border border-app/10 bg-input px-4 py-3">
                    <View className="h-4 w-32 rounded-full bg-secondary/20" />
                    <View className="h-3 w-full rounded-full bg-secondary/20 mt-2" />
                  </View>
                ))}
              </View>
            ) : statsError ? (
              <View className="rounded-3xl border border-app/10 bg-secondary/10 p-4 mb-6">
                <Text className="text-sm font-outfit text-secondary">{statsError}</Text>
              </View>
            ) : null}

            <View className="rounded-3xl border border-app/10 bg-input p-5 mb-6">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px] mb-3">
                Weekly Load
              </Text>
              {(stats.weeklyLoad.length ? stats.weeklyLoad : [0, 0, 0, 0, 0]).map((value, index) => (
                <View key={`bar-${index}`} className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs font-outfit text-secondary">
                      Week {index + 1}
                    </Text>
                    <Text className="text-xs font-outfit text-secondary">
                      {value}%
                    </Text>
                  </View>
                  <View className="h-2 rounded-full bg-secondary/15 overflow-hidden">
                    <View
                      style={{ width: `${value}%` }}
                      className="h-2 rounded-full bg-[#2F8F57]"
                    />
                  </View>
                </View>
              ))}
            </View>

            <View className="rounded-3xl border border-app/10 bg-input p-5 mb-6">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px] mb-3">
                Progress Trend
              </Text>
              <View className="flex-row items-end justify-between h-24">
                {(stats.progressTrend.length ? stats.progressTrend : [0, 0, 0, 0, 0, 0]).map((value, index) => (
                  <View key={`trend-${index}`} className="items-center flex-1">
                    <View className="h-20 w-2 rounded-full bg-secondary/15 overflow-hidden">
                      <View
                        style={{ height: `${value}%` }}
                        className="w-2 rounded-full bg-[#2F8F57]"
                      />
                    </View>
                  </View>
                ))}
              </View>
              <View className="flex-row justify-between mt-2">
                {["W1", "W2", "W3", "W4", "W5", "W6"].map((label) => (
                  <Text key={label} className="text-[10px] font-outfit text-secondary">
                    {label}
                  </Text>
                ))}
              </View>
            </View>

            <View className="rounded-3xl border border-app/10 bg-input p-5">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px] mb-3">
                Feedback Summary
              </Text>
              <View className="gap-2">
                {[
                  { label: "Video Feedback Rate", value: stats.feedback.videoFeedbackRate },
                  { label: "Coach Reply Rate", value: stats.feedback.coachReplyRate },
                  { label: "Session Completion", value: stats.feedback.sessionCompletionRate },
                ].map((item) => (
                  <View key={item.label} className="flex-row items-center justify-between">
                    <Text className="text-sm font-outfit text-app">{item.label}</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="h-2 w-24 rounded-full bg-secondary/15 overflow-hidden">
                        <View
                          style={{ width: `${item.value}%` }}
                          className="h-2 rounded-full bg-[#2F8F57]"
                        />
                      </View>
                      <Text className="text-xs font-outfit text-secondary">
                        {item.value}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ThemedScrollView>
    </SafeAreaView>
  );
}

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Lock, User } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setManagedAthletes } from "@/store/slices/userSlice";
import { apiRequest } from "@/lib/api";
import { tierRank } from "@/lib/planAccess";
import { formatPlanList, getUnlockingPlanNames } from "@/lib/unlockPlans";
import { runWhenIdle } from "@/lib/scheduling/idle";

export default function AthleteStatsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isSectionHidden } = useAgeExperience();
  const p = useAdminPastel();
  const { token, programTier, managedAthletes, profile } =
    useAppSelector((state) => state.user);
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

  const hasPremiumAccess = tierRank(programTier) >= tierRank("PHP_Premium_Plus");

  const loadAthletes = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{
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
    } catch {
      dispatch(setManagedAthletes([]));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, token]);

  const selectedAthlete = managedAthletes[0] ?? null;

  const summaryStats = useMemo(() => {
    return [
      {
        label: "Training Days",
        value: selectedAthlete?.trainingPerWeek ?? "—",
      },
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
      const [bookingsData, videosData, messagesData] = await Promise.all([
        apiRequest<{ items: any[] }>("/bookings", { token }),
        apiRequest<{ items: any[] }>("/videos", { token }),
        apiRequest<{ messages: any[]; coach?: { id?: number } }>("/messages", {
          token,
        }),
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

      const reviewedVideos = videos.filter((item) =>
        Boolean(item.feedback),
      ).length;
      const totalVideos = videos.length;

      const guardianUserId = Number(profile.id);
      const hasGuardianId = Number.isFinite(guardianUserId);
      const coachMessages = hasGuardianId
        ? messages.filter(
            (msg) => msg.senderId && msg.senderId !== guardianUserId,
          ).length
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
        Math.min(100, Math.round((count / expectedPerWeek) * 100)),
      );

      const maxProgress = Math.max(1, ...progressCounts);
      const progressTrend = progressCounts.map((count) =>
        Math.min(100, Math.round((count / maxProgress) * 100)),
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
          videoFeedbackRate: totalVideos
            ? Math.round((reviewedVideos / totalVideos) * 100)
            : 0,
          coachReplyRate: totalMessages
            ? Math.round((coachMessages / totalMessages) * 100)
            : 0,
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
    const task = runWhenIdle(() => {
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
    const task = runWhenIdle(() => {
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
    const unlockingPlans = getUnlockingPlanNames("PHP_Premium_Plus");
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8 }}>
              Athlete Stats
            </Text>
            <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 24 }}>
              This dashboard isn't available for your account yet.
            </Text>
          </View>
          <View style={{ borderRadius: 22, backgroundColor: p.cardLavender, padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Lock size={16} color={p.textSecondary} />
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textSecondary, textTransform: "uppercase", letterSpacing: 1.4 }}>
                Expanded access
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8 }}>
              Athlete analytics
            </Text>
            <Text style={{ fontSize: 16, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 24 }}>
              {unlockingPlans.length
                ? `May be available with: ${formatPlanList(unlockingPlans)}.`
                : "Ask your coach if you need access."}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.replace("/parent-platform")}
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.cardWhite,
              borderRadius: 16,
            }}
          >
            <ArrowLeft size={20} color={p.textSecondary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
            Athlete Stats
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((row) => (
              <View
                key={row}
                style={{ borderRadius: 22, backgroundColor: p.inputBg, paddingHorizontal: 16, paddingVertical: 12 }}
              >
                <View style={{ height: 16, width: 128, borderRadius: 100, backgroundColor: p.divider }} />
                <View style={{ height: 12, width: "100%", borderRadius: 100, backgroundColor: p.divider, marginTop: 8 }} />
              </View>
            ))}
          </View>
        ) : (
          <>
            <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20, marginBottom: 24 }}>
              <Text style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                Selected Athlete
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
                {selectedAthlete?.profilePicture ? (
                  <Image
                    source={{ uri: selectedAthlete.profilePicture }}
                    style={{ width: 56, height: 56, borderRadius: 16 }}
                  />
                ) : (
                  <View style={{ height: 56, width: 56, borderRadius: 16, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                    <User size={20} color={p.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                    {selectedAthlete?.name ?? "Athlete"}
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    {selectedAthlete?.team ?? "Team not set"} -{" "}
                    {selectedAthlete?.age ?? "—"} yrs
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                Overview
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {summaryStats.map((stat) => (
                  <View
                    key={stat.label}
                    style={{ width: "48%", borderRadius: 16, backgroundColor: p.cardWhite, paddingHorizontal: 16, paddingVertical: 16 }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>
                      {stat.label}
                    </Text>
                    <Text style={{ fontSize: 24, fontFamily: "Outfit-Bold", color: p.textPrimary, marginTop: 8 }}>
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {isStatsLoading ? (
              <View style={{ gap: 12, marginBottom: 24 }}>
                {[1, 2].map((row) => (
                  <View
                    key={`stat-skel-${row}`}
                    style={{ borderRadius: 22, backgroundColor: p.inputBg, paddingHorizontal: 16, paddingVertical: 12 }}
                  >
                    <View style={{ height: 16, width: 128, borderRadius: 100, backgroundColor: p.divider }} />
                    <View style={{ height: 12, width: "100%", borderRadius: 100, backgroundColor: p.divider, marginTop: 8 }} />
                  </View>
                ))}
              </View>
            ) : statsError ? (
              <View style={{ borderRadius: 22, backgroundColor: p.cardPeach, padding: 16, marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                  {statsError}
                </Text>
              </View>
            ) : null}

            <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20, marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 12 }}>
                Weekly Load
              </Text>
              {(stats.weeklyLoad.length
                ? stats.weeklyLoad
                : [0, 0, 0, 0, 0]
              ).map((value, index) => (
                <View key={`bar-${index}`} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                      Week {index + 1}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                      {value}%
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 100, backgroundColor: p.divider, overflow: "hidden" }}>
                    <View
                      style={{ width: `${value}%`, height: 8, borderRadius: 100, backgroundColor: p.accent }}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20, marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 12 }}>
                Progress Trend
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 96 }}>
                {(stats.progressTrend.length
                  ? stats.progressTrend
                  : [0, 0, 0, 0, 0, 0]
                ).map((value, index) => (
                  <View key={`trend-${index}`} style={{ alignItems: "center", flex: 1 }}>
                    <View style={{ height: 80, width: 8, borderRadius: 100, backgroundColor: p.divider, overflow: "hidden", justifyContent: "flex-end" }}>
                      <View
                        style={{ height: `${value}%`, width: 8, borderRadius: 100, backgroundColor: p.accent }}
                      />
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                {["W1", "W2", "W3", "W4", "W5", "W6"].map((label) => (
                  <Text
                    key={label}
                    style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.textMuted }}
                  >
                    {label}
                  </Text>
                ))}
              </View>
            </View>

            <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 12 }}>
                Feedback Summary
              </Text>
              <View style={{ gap: 8 }}>
                {[
                  {
                    label: "Video Feedback Rate",
                    value: stats.feedback.videoFeedbackRate,
                  },
                  {
                    label: "Coach Reply Rate",
                    value: stats.feedback.coachReplyRate,
                  },
                  {
                    label: "Session Completion",
                    value: stats.feedback.sessionCompletionRate,
                  },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary }}>
                      {item.label}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ height: 8, width: 96, borderRadius: 100, backgroundColor: p.divider, overflow: "hidden" }}>
                        <View
                          style={{ width: `${item.value}%`, height: 8, borderRadius: 100, backgroundColor: p.accent }}
                        />
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                        {item.value}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

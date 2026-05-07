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
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  ArrowLeft,
  User,
  Calendar,
  MessageCircle,
  Video,
  Trophy,
  Activity,
  TrendingUp,
  BarChart3,
} from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setManagedAthletes } from "@/store/slices/userSlice";
import { apiRequest } from "@/lib/api";
import { runWhenIdle } from "@/lib/scheduling/idle";

export default function AthleteStatsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isSectionHidden } = useAgeExperience();
  const p = useAdminPastel();
  const { token, managedAthletes, profile } = useAppSelector((state) => state.user);
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
    summary: { sessionsCompleted: 0, coachFeedback: 0, videosReviewed: 0 },
    weeklyLoad: [],
    progressTrend: [],
    feedback: { videoFeedbackRate: 0, coachReplyRate: 0, sessionCompletionRate: 0 },
  });

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
      dispatch(setManagedAthletes(data.athletes ?? []));
    } catch {
      dispatch(setManagedAthletes([]));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, token]);

  const selectedAthlete = managedAthletes[0] ?? null;

  const summaryCards = useMemo(() => [
    { label: "Training Days", value: selectedAthlete?.trainingPerWeek ?? "—", icon: Calendar, color: "cardMint" as const },
    { label: "Sessions", value: stats.summary.sessionsCompleted, icon: Trophy, color: "cardYellow" as const },
    { label: "Coach Notes", value: stats.summary.coachFeedback, icon: MessageCircle, color: "cardPeach" as const },
    { label: "Videos", value: stats.summary.videosReviewed, icon: Video, color: "cardLavender" as const },
  ], [selectedAthlete?.trainingPerWeek, stats.summary]);

  const feedbackItems = useMemo(() => [
    { label: "Video Feedback", value: stats.feedback.videoFeedbackRate, color: "cardMint" as const },
    { label: "Coach Replies", value: stats.feedback.coachReplyRate, color: "cardPeach" as const },
    { label: "Completion", value: stats.feedback.sessionCompletionRate, color: "cardYellow" as const },
  ], [stats.feedback]);

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
    const buildWeekBuckets = (count: number) =>
      Array.from({ length: count }).map((_, idx) => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() - (count - 1 - idx) * 7);
        return date;
      });
    const weekStarts = buildWeekBuckets(6);
    const loadWeekStarts = buildWeekBuckets(5);
    const resolveWeekIndex = (value: Date, buckets: Date[]) => {
      const ws = startOfWeek(value);
      const diff = currentWeekStart.getTime() - ws.getTime();
      const indexFromCurrent = Math.floor(diff / weekMs);
      const idx = buckets.length - 1 - indexFromCurrent;
      return idx >= 0 && idx < buckets.length ? idx : null;
    };

    try {
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
      const completedBookings = bookingsForAthlete.filter((item) => {
        const startsAt = toDate(item.startsAt);
        return startsAt ? startsAt.getTime() <= now.getTime() : false;
      });

      const reviewedVideos = videos.filter((item) => Boolean(item.feedback)).length;
      const totalVideos = videos.length;
      const totalBookings = bookingsForAthlete.length;

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
        Math.min(100, Math.round((count / expectedPerWeek) * 100)),
      );
      const maxProgress = Math.max(1, ...progressCounts);
      const progressTrend = progressCounts.map((count) =>
        Math.min(100, Math.round((count / maxProgress) * 100)),
      );

      setStats({
        summary: { sessionsCompleted: completedBookings.length, coachFeedback: coachMessages, videosReviewed: reviewedVideos },
        weeklyLoad,
        progressTrend,
        feedback: {
          videoFeedbackRate: totalVideos ? Math.round((reviewedVideos / totalVideos) * 100) : 0,
          coachReplyRate: totalMessages ? Math.round((coachMessages / totalMessages) * 100) : 0,
          sessionCompletionRate: totalBookings ? Math.round((completedBookings.length / totalBookings) * 100) : 0,
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
    const task = runWhenIdle(() => { if (mounted) void loadAthletes(); });
    return () => { mounted = false; task?.cancel?.(); };
  }, [loadAthletes]);

  useEffect(() => {
    let active = true;
    const task = runWhenIdle(() => { if (active) void loadStats(); });
    return () => { active = false; task?.cancel?.(); };
  }, [loadStats]);

  if (isSectionHidden("parentPlatform")) {
    return (
      <AgeGate
        title="Athlete stats locked"
        message="Athlete analytics are restricted for this age."
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace("/parent-platform")}
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.cardWhite,
              borderRadius: 14,
            }}
          >
            <ArrowLeft size={18} color={p.textSecondary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontFamily: "Outfit-SemiBold", color: p.textPrimary }}>
            Athlete Stats
          </Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <View style={{ paddingHorizontal: 24 }}>
          {isLoading ? (
            <View style={{ gap: 14 }}>
              {[1, 2, 3].map((row) => (
                <View key={row} style={{ borderRadius: 20, backgroundColor: p.cardWhite, padding: 20 }}>
                  <View style={{ height: 14, width: 120, borderRadius: 100, backgroundColor: p.inputBg }} />
                  <View style={{ height: 12, width: "100%", borderRadius: 100, backgroundColor: p.inputBg, marginTop: 12 }} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Athlete card */}
              <Animated.View entering={FadeInDown.duration(380)}>
                <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 14 }}>
                    Selected Athlete
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    {selectedAthlete?.profilePicture ? (
                      <Image
                        source={{ uri: selectedAthlete.profilePicture }}
                        style={{ width: 52, height: 52, borderRadius: 16 }}
                      />
                    ) : (
                      <View style={{ height: 52, width: 52, borderRadius: 16, backgroundColor: p.cardMint, alignItems: "center", justifyContent: "center" }}>
                        <User size={22} color={p.accent} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                        {selectedAthlete?.name ?? "Athlete"}
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 2 }}>
                        {selectedAthlete?.team ?? "Team not set"} · {selectedAthlete?.age ?? "—"} yrs
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* Summary grid */}
              <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 12, marginLeft: 2 }}>
                  Overview
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {summaryCards.map((card, idx) => {
                    const IconComp = card.icon;
                    return (
                      <Animated.View
                        key={card.label}
                        entering={FadeInDown.delay(120 + idx * 50).duration(350)}
                        style={{ width: "48%" }}
                      >
                        <View style={{ borderRadius: 18, backgroundColor: p.cardWhite, padding: 16, gap: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: p[card.color], alignItems: "center", justifyContent: "center" }}>
                              <IconComp size={15} color={p.accent} />
                            </View>
                            <Text style={{ fontSize: 11, fontFamily: "Outfit-Medium", color: p.textMuted, textTransform: "uppercase", letterSpacing: 0.8, flex: 1 }} numberOfLines={1}>
                              {card.label}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary, letterSpacing: -0.5 }}>
                            {card.value}
                          </Text>
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              </Animated.View>

              {isStatsLoading ? (
                <View style={{ gap: 12 }}>
                  {[1, 2].map((row) => (
                    <View key={`skel-${row}`} style={{ borderRadius: 20, backgroundColor: p.cardWhite, padding: 20 }}>
                      <View style={{ height: 14, width: 120, borderRadius: 100, backgroundColor: p.inputBg }} />
                      <View style={{ height: 12, width: "100%", borderRadius: 100, backgroundColor: p.inputBg, marginTop: 12 }} />
                    </View>
                  ))}
                </View>
              ) : statsError ? (
                <View style={{ borderRadius: 20, backgroundColor: p.cardPeach, padding: 18 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    {statsError}
                  </Text>
                </View>
              ) : null}

              {/* Weekly Load */}
              <Animated.View entering={FadeInDown.delay(200).duration(380)}>
                <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20, gap: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: p.cardYellow, alignItems: "center", justifyContent: "center" }}>
                      <Activity size={14} color={p.accent} />
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                      Weekly Load
                    </Text>
                  </View>
                  {(stats.weeklyLoad.length ? stats.weeklyLoad : [0, 0, 0, 0, 0]).map((value, index) => (
                    <View key={`bar-${index}`} style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: p.textSecondary }}>
                          Week {index + 1}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                          {value}%
                        </Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 100, backgroundColor: p.inputBg, overflow: "hidden" }}>
                        <View style={{ width: `${value}%`, height: 8, borderRadius: 100, backgroundColor: p.accent }} />
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>

              {/* Progress Trend */}
              <Animated.View entering={FadeInDown.delay(280).duration(380)}>
                <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: p.cardMint, alignItems: "center", justifyContent: "center" }}>
                      <TrendingUp size={14} color={p.accent} />
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                      Progress Trend
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 100, gap: 6 }}>
                    {(stats.progressTrend.length ? stats.progressTrend : [0, 0, 0, 0, 0, 0]).map((value, index) => {
                      const colors = [p.cardMint, p.cardPeach, p.cardLavender, p.cardYellow, p.cardPink, p.cardSage];
                      return (
                        <View key={`trend-${index}`} style={{ alignItems: "center", flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 9, fontFamily: "Outfit-Bold", color: p.textMuted }}>
                            {value > 0 ? `${value}%` : ""}
                          </Text>
                          <View style={{ height: 80, width: 14, borderRadius: 7, backgroundColor: p.inputBg, overflow: "hidden", justifyContent: "flex-end" }}>
                            <View style={{ height: `${Math.max(value, 4)}%`, width: 14, borderRadius: 7, backgroundColor: value > 0 ? p.accent : colors[index] }} />
                          </View>
                          <Text style={{ fontSize: 10, fontFamily: "Outfit-Medium", color: p.textMuted }}>
                            W{index + 1}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>

              {/* Feedback Summary */}
              <Animated.View entering={FadeInDown.delay(360).duration(380)}>
                <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: p.cardPeach, alignItems: "center", justifyContent: "center" }}>
                      <BarChart3 size={14} color={p.accent} />
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                      Feedback Summary
                    </Text>
                  </View>
                  <View style={{ gap: 14 }}>
                    {feedbackItems.map((item) => (
                      <View key={item.label} style={{ gap: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 14, fontFamily: "Outfit-Medium", color: p.textPrimary }}>
                            {item.label}
                          </Text>
                          <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.accent }}>
                            {item.value}%
                          </Text>
                        </View>
                        <View style={{ height: 8, borderRadius: 100, backgroundColor: p.inputBg, overflow: "hidden" }}>
                          <View style={{ width: `${item.value}%`, height: 8, borderRadius: 100, backgroundColor: p.accent }} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

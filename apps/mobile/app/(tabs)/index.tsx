import React, { memo, useCallback, useMemo, useEffect, useRef } from "react";
import {
  RefreshControl,
  StyleSheet,
  View,
  Dimensions,
  useColorScheme,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useReducedMotion,
  runOnJS,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import { SkeletonHomeScreen } from "@/components/ui/legacy-skeleton";
import { useWatchHistoryStore } from "@/lib/mmkv";
import { getWeeklySummaries } from "@/lib/sqliteRuns";
import { useAdminPastel } from "@/components/admin/AdminUI";

import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { QuickLinksSection } from "@/components/home/QuickLinksSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { useHomeContent } from "@/hooks/home/useHomeContent";
import { selectBootstrapReady } from "@/store/slices/appSlice";
import { useRunStore } from "@/store/useRunStore";
import { useAppToast } from "@/hooks/useAppToast";
import { apiRequest } from "@/lib/api";
import {
  Play,
  TrendingUp,
  Flame,
  Timer,
  Route,
  Zap,
  ChevronRight,
  Sun,
  Moon,
  CloudSun,
} from "lucide-react-native";

function getGreeting(): { text: string; period: "morning" | "afternoon" | "evening" } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", period: "morning" };
  if (h < 17) return { text: "Good afternoon", period: "afternoon" };
  return { text: "Good evening", period: "evening" };
}

type IntroAudience = "team" | "youth" | "adult";

function audienceFromAppRole(role: string | null | undefined): IntroAudience | null {
  if (!role) return null;
  if (role === "team" || role.endsWith("_team") || role.endsWith("_team_guardian")) return "team";
  if (role.startsWith("youth")) return "youth";
  if (role.startsWith("adult")) return "adult";
  return null;
}

function pickIntroVideoForRole(
  introVideos: Array<{ url: string; roles: Array<IntroAudience> }> | null | undefined,
  fallback: string | null | undefined,
  audience: IntroAudience | null,
): string | null {
  if (audience && Array.isArray(introVideos)) {
    const match = introVideos.find((rule) => rule?.roles?.includes(audience))?.url;
    if (match) return match;
  }
  return fallback ?? null;
}

function formatKm(m: number): string {
  return (m / 1000).toFixed(1);
}

function formatTime(sec: number): string {
  const hrs = sec / 3600;
  return hrs >= 1 ? `${hrs.toFixed(1)}h` : `${Math.round(sec / 60)}m`;
}

const MOTIVATIONAL = [
  "Every rep counts. Keep pushing.",
  "Champions are built in the off-season.",
  "Your only limit is your mindset.",
  "Show up. Work hard. Repeat.",
  "Progress, not perfection.",
  "The grind never lies.",
  "Be better than yesterday.",
  "Discipline beats motivation.",
];

function getDailyMotivation(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return MOTIVATIONAL[dayOfYear % MOTIVATIONAL.length];
}

function useWeeklyStats(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.home.weeklyStats(userId ?? 0),
    queryFn: () => getWeeklySummaries(new Date(), userId),
    staleTime: 5 * 60 * 1000,
  });
}

const HomeScreen = memo(function HomeScreen() {
  const p = useAdminPastel();
  const isDark = useColorScheme() === "dark";
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const toast = useAppToast();

  const token = useAppSelector((s) => s.user.token);
  const profile = useAppSelector((s) => s.user.profile);
  const appRole = useAppSelector((s) => s.user.appRole);
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";

  const { homeContent, isLoading: homeLoading, load: reloadHomeContent } = useHomeContent(token, bootstrapReady);
  const userId = profile?.id ?? null;

  const statsQuery = useWeeklyStats(userId);
  const watchHistory = useWatchHistoryStore((s) => s.history);
  const runStatus = useRunStore((s) => s.status);
  const isRunActive = runStatus === "running" || runStatus === "paused";
  const seenAttendanceToastRef = useRef<string | null>(null);

  const isLoading = statsQuery.isLoading || !bootstrapReady;
  const homeContentLoading = !homeContent;
  const stats = statsQuery.data;
  const hasTeam = appRole === "team" || appRole === "adult_athlete_team" || appRole === "youth_athlete_team_guardian";
  const showTracking = hasTeam || appRole === "adult_athlete" || appRole === "coach";

  const greeting = useMemo(() => getGreeting(), []);
  const motivation = useMemo(() => getDailyMotivation(), []);

  useFocusEffect(
    useCallback(() => {
      queryClient.prefetchQuery({ queryKey: queryKeys.home.weeklyStats(userId ?? 0), queryFn: () => getWeeklySummaries(new Date(), userId) });
    }, [queryClient, userId]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        if (!token) return;
        try {
          const data = await apiRequest<{
            item?: {
              date: string;
              requiredToday: boolean;
              completedToday: boolean;
              message?: string | null;
            };
          }>("/attendance/today", { token, skipCache: true, suppressLog: true });
          const item = data?.item;
          if (!active || !item) return;
          const key = `${item.date}:${item.requiredToday}:${item.completedToday}`;
          if (item.requiredToday && !item.completedToday && seenAttendanceToastRef.current !== key) {
            toast.info("Attendance reminder", item.message ?? "Today is your set day. Complete a session to mark attendance.");
            seenAttendanceToastRef.current = key;
          }
        } catch {
          // Non-blocking
        }
      };
      void run();
      return () => { active = false; };
    }, [token, toast]),
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.home.all() }),
      reloadHomeContent(true),
    ]);
  }, [queryClient, reloadHomeContent]);

  const navigateToTracking = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/tracking" as any);
  }, [router]);

  const navigateToProgress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/progress" as any);
  }, [router]);

  // CTA button animation
  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));
  const ctaTap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      "worklet";
      ctaScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      "worklet";
      ctaScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      "worklet";
      runOnJS(navigateToTracking)();
    }), [navigateToTracking]);

  // Pulse animation for active run indicator
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (isRunActive) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isRunActive]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: p.pageBg, paddingTop: insets.top }]}>
        <SkeletonHomeScreen />
      </View>
    );
  }

  const totalDist = stats?.totalDistance ?? 0;
  const totalTime = stats?.totalTime ?? 0;
  const numRuns = stats?.numRuns ?? 0;
  const GreetingIcon = greeting.period === "morning" ? Sun : greeting.period === "afternoon" ? CloudSun : Moon;

  return (
    <View style={[styles.screen, { backgroundColor: p.pageBg }]}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={p.accent} />}
      >
        {/* Hero */}
        <View style={[styles.heroContainer, { paddingTop: insets.top + 20, paddingBottom: 32 }]}>
          <View style={styles.heroInner}>
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(500)} style={styles.greetingRow}>
              <GreetingIcon size={18} color={p.accent} />
              <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 15, color: p.textSecondary, letterSpacing: 0.2 }}>
                {greeting.text}
              </Text>
            </Animated.View>
            <Animated.Text
              entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(500)}
              style={{ fontFamily: "Outfit-Bold", fontSize: 30, color: p.textPrimary, letterSpacing: -0.5 }}
            >
              {firstName}
            </Animated.Text>
            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(400).duration(600)}>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted, marginTop: 6, fontStyle: "italic" }}>
                {motivation}
              </Text>
            </Animated.View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Weekly summary card */}
          {showTracking && (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(100).duration(400)} style={{ marginTop: -16 }}>
              <View style={[styles.summaryCard, { backgroundColor: p.cardWhite, shadowColor: p.shadow }]}>
                {watchHistory.length > 0 ? (
                  <>
                    <View style={styles.cardBadgeRow}>
                      <View style={[styles.badge, { backgroundColor: p.accentSoft }]}>
                        <Play size={10} color={p.accent} />
                        <Text style={[styles.badgeText, { color: p.accent }]}>CONTINUE</Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, lineHeight: 24, marginTop: 8 }} numberOfLines={2}>
                      {watchHistory[0].title}
                    </Text>
                    {watchHistory[0].thumbnail && (
                      <View style={{ marginTop: 14 }}>
                        <View style={{ height: 4, borderRadius: 2, backgroundColor: p.inputBg }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: p.accent, width: `${Math.round(watchHistory[0].progress * 100)}%` }} />
                        </View>
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, marginTop: 4 }}>
                          {Math.round(watchHistory[0].progress * 100)}% complete
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.cardBadgeRow}>
                      <View style={[styles.badge, { backgroundColor: p.accentSoft }]}>
                        <Flame size={10} color={p.accent} />
                        <Text style={[styles.badgeText, { color: p.accent }]}>THIS WEEK</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 8 }}>
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 44, color: p.textPrimary, letterSpacing: -1.5, lineHeight: 48 }}>
                        {formatKm(totalDist)}
                      </Text>
                      <Text style={{ fontFamily: "Outfit-Medium", fontSize: 16, color: p.textMuted, paddingBottom: 7 }}>km</Text>
                    </View>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted }}>
                      total distance
                    </Text>
                  </>
                )}

                {/* CTA Button */}
                <GestureDetector gesture={ctaTap}>
                  <Animated.View style={[ctaStyle, { marginTop: 18 }]} accessibilityRole="button">
                    <View style={[styles.ctaButton, { backgroundColor: p.accent }]}>
                      {isRunActive ? (
                        <Animated.View style={[pulseStyle, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.buttonPrimaryText }} />
                          <Text style={[styles.ctaText, { color: p.buttonPrimaryText }]}>Running now</Text>
                        </Animated.View>
                      ) : (
                        <>
                          <Play size={15} color={p.buttonPrimaryText} fill={p.buttonPrimaryText} />
                          <Text style={[styles.ctaText, { color: p.buttonPrimaryText }]}>
                            {watchHistory.length > 0 ? "Resume watching" : "Start session"}
                          </Text>
                        </>
                      )}
                    </View>
                  </Animated.View>
                </GestureDetector>
              </View>
            </Animated.View>
          )}

          {/* Stat pills */}
          {showTracking && (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(350).springify()} style={styles.statsRow}>
              <StatPill
                icon={<Route size={14} color={p.accent} />}
                value={formatKm(totalDist)}
                unit="km"
                label="Distance"
                bg={p.cardMint}
                p={p}
                onPress={navigateToProgress}
                reduceMotion={reduceMotion}
              />
              <StatPill
                icon={<Timer size={14} color={isDark ? p.warning : "#C48520"} />}
                value={formatTime(totalTime)}
                unit=""
                label="Time"
                bg={p.cardYellow}
                p={p}
                onPress={navigateToProgress}
                reduceMotion={reduceMotion}
              />
              <StatPill
                icon={<Zap size={14} color={isDark ? p.danger : "#C04E50"} />}
                value={String(numRuns)}
                unit=""
                label="Sessions"
                bg={p.cardPink}
                p={p}
                onPress={navigateToProgress}
                reduceMotion={reduceMotion}
              />
            </Animated.View>
          )}

          {/* Quick links */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(240).duration(300).springify()}>
            <QuickLinksSection appRole={appRole} />
          </Animated.View>

          {/* Intro video */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(300).duration(300).springify()}>
            <IntroVideoSection
              introVideoUrl={pickIntroVideoForRole(homeContent?.introVideos, homeContent?.introVideoUrl, audienceFromAppRole(appRole))}
              posterUrl={homeContent?.heroImageUrl}
              isTabActive={true}
              tabIndex={0}
              loading={homeContentLoading}
            />
          </Animated.View>

          {/* Coach story */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(360).duration(300).springify()}>
            <AdminStorySection story={homeContent?.adminStory} photoUrl={homeContent?.professionalPhoto} loading={homeContentLoading} />
          </Animated.View>

          {/* Testimonials */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(420).duration(300).springify()}>
            <TestimonialsSection items={homeContent?.testimonials} loading={homeContentLoading} />
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </View>
  );
});

export default HomeScreen;

const StatPill = React.memo(function StatPill({
  icon,
  value,
  unit,
  label,
  bg,
  p,
  onPress,
  reduceMotion,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
  bg: string;
  p: any;
  onPress: () => void;
  reduceMotion: boolean | null;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      "worklet";
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      "worklet";
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      "worklet";
      runOnJS(onPress)();
    }), [onPress]);

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[animStyle, { flex: 1 }]}>
        <View style={[styles.statPill, { backgroundColor: bg }]}>
          <View style={styles.statPillIconRow}>
            {icon}
            <Text style={{ fontFamily: "Outfit-Medium", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: p.textMuted }}>
              {label}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, letterSpacing: -0.5, color: p.textPrimary }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {value}
            </Text>
            {unit ? <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>{unit}</Text> : null}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heroContainer: { width: "100%", paddingHorizontal: 22 },
  heroInner: { gap: 2 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  content: { paddingHorizontal: 20, gap: 14 },
  summaryCard: {
    width: "100%",
    borderRadius: 24,
    padding: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  cardBadgeRow: { flexDirection: "row" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: { fontFamily: "Outfit-Bold", fontSize: 10, letterSpacing: 1.2 },
  ctaButton: {
    height: 48,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { fontFamily: "Outfit-Bold", fontSize: 15 },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  statPillIconRow: { flexDirection: "row", alignItems: "center", gap: 5 },
});

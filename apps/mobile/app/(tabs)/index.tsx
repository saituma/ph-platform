import React, { memo, useCallback, useMemo, useEffect, useRef } from "react";
import {
  RefreshControl,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withSpring,
  useReducedMotion,
  runOnJS,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import { SkeletonHomeScreen } from "@/components/ui/legacy-skeleton";
import { useWatchHistoryStore } from "@/lib/mmkv";
import { getWeeklySummaries } from "@/lib/sqliteRuns";

import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { QuickLinksSection } from "@/components/home/QuickLinksSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { useHomeContent } from "@/hooks/home/useHomeContent";
import { selectBootstrapReady } from "@/store/slices/appSlice";
import { useRunStore } from "@/store/useRunStore";
import { useAppToast } from "@/hooks/useAppToast";
import { apiRequest } from "@/lib/api";

// ── Constants ────────────────────────────────────────────────────────

const HERO_HEIGHT = 220; 

// ── Helpers ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
  return hrs >= 1 ? `${hrs.toFixed(1)}` : `${Math.round(sec / 60)}m`;
}

// ── Data hooks ───────────────────────────────────────────────────────

function useWeeklyStats(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.home.weeklyStats(userId ?? 0),
    queryFn: () => getWeeklySummaries(new Date(), userId),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Components ───────────────────────────────────────────────────────

const Sparkle = memo(({ size, top, left, delay }: { size: number, top: number, left: number, delay: number }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(withTiming(0.8, { duration: 1500 }), withTiming(0, { duration: 1500 })), -1, true));
    scale.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 1500 }), withTiming(0.4, { duration: 1500 })), -1, true));
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#FFF",
        },
        style,
      ]}
    />
  );
});

// ── Main screen ──────────────────────────────────────────────────────

const HomeScreen = memo(function HomeScreen() {
  const { colors, isDark } = useAppTheme();
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
          // Non-blocking: this reminder should never break Home rendering.
        }
      };
      void run();
      return () => {
        active = false;
      };
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

  // Spring micro-interactions via native gesture handler
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


  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <SkeletonHomeScreen />
      </View>
    );
  }

  const totalDist = stats?.totalDistance ?? 0;
  const totalTime = stats?.totalTime ?? 0;
  const numRuns = stats?.numRuns ?? 0;

  const cardBg = isDark ? "hsl(220, 8%, 11%)" : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";
  const primaryText = isDark ? "hsl(220, 5%, 93%)" : "hsl(220, 8%, 10%)";
  const secondaryText = isDark ? "hsl(220, 5%, 56%)" : "hsl(220, 5%, 46%)";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* ── Scrollable Body ──────────────────────────────────── */}
      <Animated.ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        {/* ── Hero Section (Normal Scroll) ────────────────────── */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT + insets.top, paddingTop: insets.top }]}>
          <LinearGradient
            colors={[colors.accent, isDark ? "rgba(138, 255, 0, 0.4)" : "rgba(106, 204, 0, 0.5)", "transparent"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          />
          
          {/* Sparkles */}
          <Sparkle size={4} top={60} left={40} delay={0} />
          <Sparkle size={3} top={120} left={80} delay={500} />
          <Sparkle size={5} top={40} left={250} delay={1000} />
          <Sparkle size={3} top={150} left={320} delay={1500} />
          <Sparkle size={4} top={90} left={180} delay={2000} />

          <View style={styles.heroTextContainer}>
            <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={[styles.heroGreeting, { color: "#FFF" }]}>{getGreeting()},</Animated.Text>
            <Animated.Text entering={FadeInDown.delay(250).duration(600)} style={[styles.heroName, { color: "#FFF" }]}>{firstName}</Animated.Text>
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.content}>
          
          {/* Hero card (Overlap) */}
          {showTracking && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)} style={{ marginTop: -40 }}>
            <View style={[styles.heroCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, shadowColor: colors.accent, shadowOffset: { width: 0, height: 12 }, shadowOpacity: isDark ? 0.2 : 0.08, shadowRadius: 24, elevation: 8 }]}>
              {watchHistory.length > 0 ? (
                <>
                  <Text style={[styles.microLabel, { color: colors.accent }]}>CONTINUE WATCHING</Text>
                  <Text style={[styles.heroNumber, { fontFamily: "Chillax-Semibold", color: primaryText }]} numberOfLines={2}>{watchHistory[0].title}</Text>
                  {watchHistory[0].thumbnail && (
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressTrack, { backgroundColor: isDark ? "hsl(220,8%,20%)" : "hsl(220,8%,88%)" }]}>
                        <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${Math.round(watchHistory[0].progress * 100)}%` }]} />
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.microLabel, { color: colors.accent }]}>THIS WEEK</Text>
                  <View style={styles.heroRow}>
                    <Text style={[styles.heroNumber, { fontFamily: "Chillax-Semibold", color: primaryText }]}>{formatKm(totalDist)}</Text>
                    <Text style={[styles.heroUnit, { fontFamily: "Outfit-Medium", color: secondaryText }]}>km</Text>
                  </View>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: secondaryText, marginTop: 2 }}>total distance this week</Text>
                </>
              )}
              <GestureDetector gesture={ctaTap}>
                <Animated.View style={[ctaStyle, { marginTop: 20 }]} accessibilityRole="button">
                  <View style={[styles.ctaBtn, { backgroundColor: colors.accent, borderWidth: isDark ? 1 : 0, borderColor: isDark ? "rgba(255,255,255,0.10)" : "transparent" }]}>
                    <Text style={[styles.ctaText, { fontFamily: "Outfit-Bold", color: isDark ? "hsl(220,8%,10%)" : "hsl(0,0%,98%)" }]}>
                      {isRunActive ? "Running" : watchHistory.length > 0 ? "Resume watching" : "Start session"}
                    </Text>
                  </View>
                </Animated.View>
              </GestureDetector>
            </View>
          </Animated.View>
          )}

          {/* Quick stats row */}
          {showTracking && (
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(300).springify()} style={styles.statsRow}>
            {[
              { value: formatKm(totalDist), label: "Dist", unit: "km" },
              { value: formatTime(totalTime), label: "Time", unit: totalTime >= 3600 ? "hr" : "min" },
              { value: String(numRuns), label: "Sessions", unit: "" },
            ].map((stat) => (
              <HomeStatCard key={stat.label} stat={stat} onPress={navigateToTracking} cardBg={cardBg} cardBorder={cardBorder} accentColor={colors.accent} primaryText={primaryText} secondaryText={secondaryText} />
            ))}
          </Animated.View>
          )}

          {/* Rest of the sections */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(140).duration(300).springify()}>
            <QuickLinksSection appRole={appRole} />
          </Animated.View>
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(220).duration(300).springify()}>
            <IntroVideoSection introVideoUrl={pickIntroVideoForRole(homeContent?.introVideos, homeContent?.introVideoUrl, audienceFromAppRole(appRole))} posterUrl={homeContent?.heroImageUrl} isTabActive={true} tabIndex={0} loading={homeContentLoading} />
          </Animated.View>
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(280).duration(300).springify()}>
            <AdminStorySection story={homeContent?.adminStory} photoUrl={homeContent?.professionalPhoto} loading={homeContentLoading} />
          </Animated.View>
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(340).duration(300).springify()}>
            <TestimonialsSection items={homeContent?.testimonials} loading={homeContentLoading} />
          </Animated.View>

        </View>
      </Animated.ScrollView>
    </View>
  );
});

export default HomeScreen;

// ── HomeStatCard ────────────────────────────────────────────────────

const HomeStatCard = React.memo(function HomeStatCard({
  stat, onPress, cardBg, cardBorder, accentColor, primaryText, secondaryText,
}: {
  stat: { value: string; label: string; unit: string };
  onPress: () => void; cardBg: string; cardBorder: string; accentColor: string; primaryText: string; secondaryText: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tap = useMemo(() => Gesture.Tap().onBegin(() => { "worklet"; scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 }); runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light); }).onFinalize(() => { "worklet"; scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 }); }).onEnd(() => { "worklet"; runOnJS(onPress)(); }), [onPress]);
  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[animStyle, { flex: 1 }]}>
        <View style={[styles.statCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
          <Text style={[styles.statLabel, { color: accentColor }]} numberOfLines={1}>{stat.label}</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { fontFamily: "Chillax-Semibold", color: primaryText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{stat.value}</Text>
            {stat.unit && <Text style={[styles.statUnit, { color: secondaryText }]}>{stat.unit}</Text>}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heroContainer: { width: "100%", overflow: "hidden" },
  heroTextContainer: { paddingHorizontal: 20, marginTop: 20 },
  heroGreeting: { fontFamily: "Outfit-Bold", fontSize: 24, letterSpacing: -0.5, opacity: 0.9 },
  heroName: { fontFamily: "Outfit-Black", fontSize: 42, letterSpacing: -1.5, lineHeight: 46, marginTop: 2 },
  content: { paddingHorizontal: 20, gap: 12 },
  heroCard: { width: "100%", minHeight: 200, borderRadius: 24, padding: 24, justifyContent: "flex-end" },
  microLabel: { fontFamily: "Outfit-Medium", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  heroRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 4 },
  heroNumber: { fontSize: 48, letterSpacing: -1, lineHeight: 52 },
  heroUnit: { fontSize: 20, paddingBottom: 8, letterSpacing: -0.3 },
  progressContainer: { marginTop: 12 },
  progressTrack: { height: 4, borderRadius: 2, width: "100%" },
  progressFill: { height: 4, borderRadius: 2 },
  ctaBtn: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { borderRadius: 16, padding: 12, gap: 4 },
  statLabel: { fontFamily: "Outfit-Bold", fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase" },
  statValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  statValue: { fontSize: 22, letterSpacing: -0.5, flexShrink: 1 },
  statUnit: { fontFamily: "Outfit-Regular", fontSize: 11, paddingBottom: 3 },
});

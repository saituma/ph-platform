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
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useReducedMotion,
  runOnJS,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
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
import { Play, TrendingUp } from "lucide-react-native";

const HERO_HEIGHT = 200;

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

function useWeeklyStats(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.home.weeklyStats(userId ?? 0),
    queryFn: () => getWeeklySummaries(new Date(), userId),
    staleTime: 5 * 60 * 1000,
  });
}

const HomeScreen = memo(function HomeScreen() {
  const p = useAdminPastel();
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
      <View style={[styles.screen, { backgroundColor: p.pageBg, paddingTop: insets.top }]}>
        <SkeletonHomeScreen />
      </View>
    );
  }

  const totalDist = stats?.totalDistance ?? 0;
  const totalTime = stats?.totalTime ?? 0;
  const numRuns = stats?.numRuns ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: p.pageBg }]}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={p.accent} />}
      >
        {/* Hero */}
        <View style={[styles.heroContainer, { paddingTop: insets.top + 16, paddingBottom: 24, backgroundColor: p.cardSage }]}>
          <View style={styles.heroTextContainer}>
            <Animated.Text
              entering={FadeInDown.delay(100).duration(600)}
              style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textSecondary }}
            >
              {getGreeting()},
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(250).duration(600)}
              style={{ fontFamily: "Outfit-Bold", fontSize: 32, color: p.textPrimary, letterSpacing: -0.5, marginTop: 2 }}
            >
              {firstName}
            </Animated.Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Hero card */}
          {showTracking && (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(400)} style={{ marginTop: -20 }}>
              <View style={[styles.heroCard, { backgroundColor: p.cardWhite }]}>
                {watchHistory.length > 0 ? (
                  <>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.accent, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 8 }}>
                      CONTINUE WATCHING
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary, lineHeight: 26 }} numberOfLines={2}>
                      {watchHistory[0].title}
                    </Text>
                    {watchHistory[0].thumbnail && (
                      <View style={{ marginTop: 12 }}>
                        <View style={{ height: 4, borderRadius: 2, backgroundColor: p.inputBg }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: p.accent, width: `${Math.round(watchHistory[0].progress * 100)}%` }} />
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.accent, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 8 }}>
                      THIS WEEK
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 42, color: p.textPrimary, letterSpacing: -1, lineHeight: 46 }}>
                        {formatKm(totalDist)}
                      </Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 18, color: p.textSecondary, paddingBottom: 6 }}>km</Text>
                    </View>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, marginTop: 2 }}>
                      total distance this week
                    </Text>
                  </>
                )}
                <GestureDetector gesture={ctaTap}>
                  <Animated.View style={[ctaStyle, { marginTop: 20 }]} accessibilityRole="button">
                    <View style={{ height: 50, borderRadius: 100, backgroundColor: p.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Play size={16} color={p.buttonPrimaryText} />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.buttonPrimaryText }}>
                        {isRunActive ? "Running" : watchHistory.length > 0 ? "Resume watching" : "Start session"}
                      </Text>
                    </View>
                  </Animated.View>
                </GestureDetector>
              </View>
            </Animated.View>
          )}

          {/* Stats row */}
          {showTracking && (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(140).duration(300).springify()} style={styles.statsRow}>
              {[
                { value: formatKm(totalDist), label: "Dist", unit: "km" },
                { value: formatTime(totalTime), label: "Time", unit: totalTime >= 3600 ? "hr" : "min" },
                { value: String(numRuns), label: "Sessions", unit: "" },
              ].map((stat) => (
                <HomeStatCard key={stat.label} stat={stat} onPress={navigateToTracking} p={p} />
              ))}
            </Animated.View>
          )}

          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(200).duration(300).springify()}>
            <QuickLinksSection appRole={appRole} />
          </Animated.View>
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(260).duration(300).springify()}>
            <IntroVideoSection introVideoUrl={pickIntroVideoForRole(homeContent?.introVideos, homeContent?.introVideoUrl, audienceFromAppRole(appRole))} posterUrl={homeContent?.heroImageUrl} isTabActive={true} tabIndex={0} loading={homeContentLoading} />
          </Animated.View>
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(320).duration(300).springify()}>
            <AdminStorySection story={homeContent?.adminStory} photoUrl={homeContent?.professionalPhoto} loading={homeContentLoading} />
          </Animated.View>
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(380).duration(300).springify()}>
            <TestimonialsSection items={homeContent?.testimonials} loading={homeContentLoading} />
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </View>
  );
});

export default HomeScreen;

const HomeStatCard = React.memo(function HomeStatCard({
  stat, onPress, p,
}: {
  stat: { value: string; label: string; unit: string };
  onPress: () => void;
  p: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tap = useMemo(() => Gesture.Tap()
    .onBegin(() => { "worklet"; scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 }); runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light); })
    .onFinalize(() => { "worklet"; scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 }); })
    .onEnd(() => { "worklet"; runOnJS(onPress)(); }), [onPress]);

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[animStyle, { flex: 1 }]}>
        <View style={{ borderRadius: 18, padding: 14, backgroundColor: p.cardWhite, gap: 4 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", color: p.accent }}>
            {stat.label}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, letterSpacing: -0.5, color: p.textPrimary }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {stat.value}
            </Text>
            {stat.unit ? <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, paddingBottom: 3, color: p.textMuted }}>{stat.unit}</Text> : null}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heroContainer: { width: "100%", overflow: "hidden" },
  heroTextContainer: { paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, gap: 12 },
  heroCard: { width: "100%", minHeight: 190, borderRadius: 24, padding: 22, justifyContent: "flex-end" },
  statsRow: { flexDirection: "row", gap: 8 },
});

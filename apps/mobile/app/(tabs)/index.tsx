import React, { memo, useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  View,
  Dimensions,
  useColorScheme,
  Image,
  ImageBackground,
  Pressable,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInRight,
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
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import { SkeletonHomeScreen } from "@/components/ui/legacy-skeleton";
import { useWatchHistoryStore } from "@/lib/mmkv";
import { getWeeklySummaries } from "@/lib/sqliteRuns";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Colors } from "@/constants/theme";

import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { QuickLinksSection } from "@/components/home/QuickLinksSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { StreakModal } from "@/components/home/StreakModal";
import { useStreakStore } from "@/lib/streakStore";
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
  Bell,
  PersonStanding,
  Activity,
} from "lucide-react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_H * 0.52;

const HOME_BG = require("@/assets/images/home-bg.png");

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
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

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
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

// ── Glass stat pill (floating on hero image) ──
function GlassPill({
  icon,
  value,
  label,
  delay: pillDelay,
  reduceMotion,
  isDark,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
  reduceMotion: boolean | null;
  isDark: boolean;
}) {
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInRight.delay(pillDelay).duration(500).springify().damping(16)}>
      <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={[s.glassPill, !isDark && { borderColor: "rgba(0,0,0,0.08)" }]}>
        <View style={s.glassPillInner}>
          {icon}
          <Text style={[s.glassPillValue, { color: isDark ? "#FFFFFF" : "#0C0A09" }]}>{value}</Text>
          <Text style={[s.glassPillLabel, { color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }]}>{label}</Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

// ── Stat card ──
function StatCard({
  icon,
  label,
  value,
  unit,
  accentColor,
  delay: cardDelay,
  onPress,
  reduceMotion,
  half,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  accentColor: string;
  delay: number;
  onPress?: () => void;
  reduceMotion: boolean | null;
  half?: boolean;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(cardDelay).duration(400).springify().damping(16)}
      style={[half ? s.statCardHalf : s.statCardFull]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 350 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      >
        <Animated.View style={[s.statCardInner, {
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        }, animStyle]}>
          <View style={s.statCardHeader}>
            {icon}
            <Text style={[s.statCardLabel, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)" }]}>{label}</Text>
          </View>
          <View style={s.statCardValueRow}>
            <Text style={[s.statCardValue, { color: accentColor }]}>{value}</Text>
            {unit ? <Text style={[s.statCardUnit, { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" }]}>{unit}</Text> : null}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const HomeScreen = memo(function HomeScreen() {
  const p = useAdminPastel();
  const isDark = useColorScheme() === "dark";
  const t = isDark ? Colors.dark : Colors.light;
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
  const profilePic = profile?.avatar ?? null;

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
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const hasTeam = appRole === "team" || appRole === "adult_athlete_team" || appRole === "youth_athlete_team_guardian";
  const showTracking = hasTeam || appRole === "adult_athlete" || appRole === "coach" || capabilities?.runTracking === true;

  const greeting = useMemo(() => getGreeting(), []);
  const motivation = useMemo(() => getDailyMotivation(), []);
  const streak = useStreakStore((s) => s.currentStreak);

  const shouldShowStreak = useStreakStore((s) => s.shouldShowStreak);
  const [streakVisible, setStreakVisible] = useState(false);
  useEffect(() => {
    if (bootstrapReady && shouldShowStreak()) {
      const timer = setTimeout(() => setStreakVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [bootstrapReady]);

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

  const navigateToTracking2 = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/tracking" as any);
  }, [router]);

  const navigateToSchedule = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/schedule" as any);
  }, [router]);

  const navigateToNotifications = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/notifications" as any);
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
      <View style={[s.screen, { backgroundColor: isDark ? "#000000" : p.pageBg, paddingTop: insets.top }]}>
        <SkeletonHomeScreen />
      </View>
    );
  }

  const totalDist = stats?.totalDistance ?? 0;
  const totalTime = stats?.totalTime ?? 0;
  const numRuns = stats?.numRuns ?? 0;
  const accentLime = t.accent;

  const heroGradientMid = isDark ? "rgba(0,0,0,0.6)" : "rgba(244,250,242,0.6)";
  const heroGradientEnd = isDark ? "#000000" : p.pageBg;
  const heroTextColor = isDark ? "#FFFFFF" : p.textPrimary;
  const heroSubColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const pillIconColor = isDark ? "#FFFFFF" : p.textPrimary;

  return (
    <View style={[s.screen, { backgroundColor: isDark ? "#000000" : p.pageBg }]}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={accentLime} />}
        style={{ backgroundColor: isDark ? "#000000" : p.pageBg }}
      >
        {/* ── Hero with background image ── */}
        <View style={[s.hero, { height: HERO_HEIGHT + insets.top }]}>
          <Image source={HOME_BG} style={s.heroBgImage} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", heroGradientMid, heroGradientEnd]}
            locations={[0.3, 0.7, 1]}
            style={s.heroGradient}
          />

          <View style={[s.heroContent, { paddingTop: insets.top + 12 }]}>
            {/* Top bar: avatar + streak + bell */}
            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(100).duration(400)} style={s.topBar}>
              <View style={s.topBarLeft}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={[s.avatar, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }]} />
                ) : (
                  <View style={[s.avatar, s.avatarPlaceholder, {
                    borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                  }]}>
                    <Text style={[s.avatarInitial, { color: heroTextColor }]}>{firstName[0]}</Text>
                  </View>
                )}
              </View>
              <View style={s.topBarRight}>
                {streak > 0 && (
                  <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(400).duration(400)} style={s.streakBadge}>
                    <Flame size={13} color="#FF9500" fill="#FF9500" />
                    <Text style={s.streakText}>{streak}</Text>
                  </Animated.View>
                )}
                <Pressable onPress={navigateToNotifications} style={[s.bellBtn, {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                }]}>
                  <Bell size={18} color={heroTextColor} />
                  <View style={[s.bellDot, { backgroundColor: accentLime, borderColor: isDark ? "#000000" : p.pageBg }]} />
                </Pressable>
              </View>
            </Animated.View>

            {/* Greeting */}
            <View style={s.greetingWrap}>
              <Animated.Text
                entering={reduceMotion ? undefined : FadeInDown.delay(200).duration(500)}
                style={[s.greetingSmall, { color: heroSubColor }]}
              >
                {greeting}
              </Animated.Text>
              <Animated.Text
                entering={reduceMotion ? undefined : FadeInDown.delay(300).duration(500)}
                style={[s.greetingName, { color: heroTextColor }]}
              >
                {firstName}!
              </Animated.Text>
            </View>

            {/* Floating glass pills */}
            {showTracking && (
              <View style={s.glassPillsWrap}>
                <GlassPill
                  icon={<PersonStanding size={14} color={pillIconColor} />}
                  value={formatCompact(Math.round(totalDist / 0.7))}
                  label="Steps"
                  delay={500}
                  reduceMotion={reduceMotion}
                  isDark={isDark}
                />
                <GlassPill
                  icon={<Activity size={14} color={pillIconColor} />}
                  value={formatCompact(numRuns * 180)}
                  label="Calories"
                  delay={650}
                  reduceMotion={reduceMotion}
                  isDark={isDark}
                />
              </View>
            )}
          </View>
        </View>

        <View style={[s.content, { backgroundColor: isDark ? "#000000" : p.pageBg }]}>
          {/* Stat cards grid */}
          {showTracking && (
            <View style={s.statsGrid}>
              <StatCard
                icon={<Route size={14} color={accentLime} />}
                label="Distance"
                value={formatKm(totalDist)}
                unit="km"
                accentColor={accentLime}
                delay={200}
                onPress={navigateToTracking2}
                reduceMotion={reduceMotion}
                half
                isDark={isDark}
              />
              <StatCard
                icon={<Timer size={14} color="#FFB020" />}
                label="Active Min"
                value={formatTime(totalTime)}
                accentColor="#FFB020"
                delay={280}
                onPress={navigateToProgress}
                reduceMotion={reduceMotion}
                half
                isDark={isDark}
              />
              <StatCard
                icon={<Zap size={14} color="#FF6B6B" />}
                label="Sessions"
                value={String(numRuns)}
                accentColor="#FF6B6B"
                delay={360}
                onPress={navigateToSchedule}
                reduceMotion={reduceMotion}
                half
                isDark={isDark}
              />
              <StatCard
                icon={<PersonStanding size={14} color="#7ABCD4" />}
                label="Daily Steps"
                value={formatCompact(Math.round(totalDist / 0.7))}
                accentColor="#7ABCD4"
                delay={440}
                onPress={navigateToTracking2}
                reduceMotion={reduceMotion}
                half
                isDark={isDark}
              />
            </View>
          )}

          {/* Quick links */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(500).duration(300).springify()}>
            <QuickLinksSection appRole={appRole} />
          </Animated.View>

          {/* Intro video */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(560).duration(300).springify()}>
            <IntroVideoSection
              introVideoUrl={pickIntroVideoForRole(homeContent?.introVideos, homeContent?.introVideoUrl, audienceFromAppRole(appRole))}
              posterUrl={homeContent?.heroImageUrl}
              isTabActive={true}
              tabIndex={0}
              loading={homeContentLoading}
            />
          </Animated.View>

          {/* Coach story */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(620).duration(300).springify()}>
            <AdminStorySection story={homeContent?.adminStory} photoUrl={homeContent?.professionalPhoto} loading={homeContentLoading} />
          </Animated.View>

          {/* Testimonials */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(680).duration(300).springify()}>
            <TestimonialsSection items={homeContent?.testimonials} loading={homeContentLoading} />
          </Animated.View>
        </View>
      </Animated.ScrollView>

      <StreakModal
        visible={streakVisible}
        onClose={() => setStreakVisible(false)}
        firstName={firstName}
      />
    </View>
  );
});

export default HomeScreen;

const s = StyleSheet.create({
  screen: { flex: 1 },

  // ── Hero ──
  hero: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  heroBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "space-between",
    paddingBottom: 30,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,149,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,149,0,0.25)",
  },
  streakText: {
    fontFamily: "Outfit-Bold",
    fontSize: 14,
    color: "#FF9500",
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },

  // ── Greeting ──
  greetingWrap: {
    marginTop: 20,
  },
  greetingSmall: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
  },
  greetingName: {
    fontFamily: "Outfit-Bold",
    fontSize: 42,
    letterSpacing: -1,
    lineHeight: 48,
  },

  // ── Glass pills ──
  glassPillsWrap: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  glassPill: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  glassPillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  glassPillValue: {
    fontFamily: "Outfit-Bold",
    fontSize: 15,
  },
  glassPillLabel: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
  },

  // ── Content ──
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },

  // ── Summary card ──
  summaryCard: {
    width: "100%",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
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
  summaryTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
    lineHeight: 24,
    marginTop: 8,
  },
  summaryBigNum: {
    fontFamily: "Outfit-Bold",
    fontSize: 44,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  summaryUnit: {
    fontFamily: "Outfit-Medium",
    fontSize: 16,
    paddingBottom: 7,
  },
  summarySubtext: {
    fontFamily: "Outfit-Regular",
    fontSize: 13,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: "Outfit-Regular",
    fontSize: 11,
    marginTop: 4,
  },
  ctaButton: {
    height: 48,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { fontFamily: "Outfit-Bold", fontSize: 15 },

  // ── Stat cards ──
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCardHalf: {
    width: (SCREEN_W - 50) / 2,
  },
  statCardFull: {
    width: "100%",
  },
  statCardInner: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statCardLabel: {
    fontFamily: "Outfit-Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  statCardValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  statCardValue: {
    fontFamily: "Outfit-Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  statCardUnit: {
    fontFamily: "Outfit-Regular",
    fontSize: 13,
  },
});

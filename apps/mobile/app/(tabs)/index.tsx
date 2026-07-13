import React, { memo, useCallback, useMemo, useEffect, useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  View,
  Dimensions,
  Platform,
  useColorScheme,
} from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { Text } from "@/components/ScaledText";
import { SkeletonHomeScreen } from "@/components/ui/legacy-skeleton";
import { getWeeklySummaries } from "@/lib/sqliteRuns";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Colors } from "@/constants/theme";

import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { QuickLinksSection } from "@/components/home/QuickLinksSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { StreakModal } from "@/components/home/StreakModal";
import { StreakMilestoneModal } from "@/components/home/StreakMilestoneModal";
import { PermissionPromptSheet } from "@/components/home/PermissionPromptSheet";
import { useStreakStore } from "@/lib/streakStore";
import { scheduleStreakReminder } from "@/lib/streakReminder";
import { useHomeContent } from "@/hooks/home/useHomeContent";
import { pickIntroVideoForAudience, type IntroAudience } from "@/lib/home/introVideo";
import { selectBootstrapReady } from "@/store/slices/appSlice";
import { useRunStore } from "@/store/useRunStore";
import { apiRequest } from "@/lib/api";
import {
  Flame,
  Timer,
  Route,
  Zap,
  Bell,
} from "lucide-react-native";

const HOME_BG = require("@/assets/images/home-bg.png") as number;

const { width: _SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SCREEN_W = Platform.isPad ? Math.min(_SCREEN_W, 560) : _SCREEN_W;
const HERO_HEIGHT = SCREEN_H * 0.52;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

function audienceFromAppRole(role: string | null | undefined): IntroAudience | null {
  if (!role) return null;
  if (role === "team" || role.endsWith("_team") || role.endsWith("_team_guardian")) return "team";
  if (role.startsWith("youth")) return "youth";
  if (role.startsWith("adult")) return "adult";
  return null;
}

function formatKm(m: number): string {
  return (m / 1000).toFixed(1);
}

function formatTime(sec: number): string {
  const seconds = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  if (seconds < 60) return `${seconds}s`;
  const hrs = seconds / 3600;
  return hrs >= 1 ? `${hrs.toFixed(1)}h` : `${Math.round(seconds / 60)}m`;
}

function useWeeklyStats(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.home.weeklyStats(userId ?? 0),
    queryFn: () => getWeeklySummaries(new Date(), userId),
    staleTime: 5 * 60 * 1000,
  });
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

  const tap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      "worklet";
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      "worklet";
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      "worklet";
      if (onPress) runOnJS(onPress)();
    }), [onPress]);

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(cardDelay).duration(350)}
      style={[half ? s.statCardHalf : s.statCardFull]}
    >
      <GestureDetector gesture={tap}>
        <Animated.View
          style={[s.statCardInner, {
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          }, animStyle]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View style={s.statCardHeader}>
            {icon}
            <Text style={[s.statCardLabel, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)" }]}>{label}</Text>
          </View>
          <View style={s.statCardValueRow}>
            <Text style={[s.statCardValue, { color: accentColor }]}>{value}</Text>
            {unit ? <Text style={[s.statCardUnit, { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" }]}>{unit}</Text> : null}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function StreakIndicator({
  streak,
  freezesAvailable,
  reduceMotion,
  onPress,
}: {
  streak: number;
  freezesAvailable: number;
  reduceMotion: boolean | null;
  onPress: () => void;
}) {
  const active = streak > 0;
  const flameScale = useSharedValue(1);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (active && !reduceMotion) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 900 }),
          withTiming(1, { duration: 900 }),
        ),
        -1,
        true,
      );
    } else {
      flameScale.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(flameScale);
  }, [active, reduceMotion]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const tap = useMemo(() => Gesture.Tap()
    .hitSlop({ top: 10, bottom: 10, left: 10, right: 10 })
    .onBegin(() => {
      "worklet";
      pressScale.value = withSpring(0.88, { damping: 15, stiffness: 400, mass: 0.3 });
    })
    .onFinalize(() => {
      "worklet";
      pressScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      "worklet";
      runOnJS(onPress)();
    }), [onPress]);

  const flameColor = active ? "#FF9500" : "rgba(255,255,255,0.28)";

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[s.streakIndicator, containerStyle]} accessibilityRole="button" accessibilityLabel={`Streak: ${streak} days`}>
        <View>
          <Animated.View style={flameStyle}>
            <Flame
              size={26}
              color={flameColor}
              fill={active ? "#FF9500" : "none"}
              strokeWidth={active ? 1 : 1.8}
            />
          </Animated.View>
          {freezesAvailable > 0 && (
            <View style={s.streakFreezeDot}>
              <Text style={s.streakFreezeDotText}>{freezesAvailable}</Text>
            </View>
          )}
        </View>
        <Text style={[s.streakCount, { color: flameColor }]}>
          {streak}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

function BellButton({ onPress, unread, isDark, accentColor, pageBg }: {
  onPress: () => void;
  unread: boolean;
  isDark: boolean;
  accentColor: string;
  pageBg: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      "worklet";
      scale.value = withSpring(0.88, { damping: 15, stiffness: 400, mass: 0.3 });
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
      <Animated.View
        style={[s.bellBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)" }, animStyle]}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Bell size={18} color={isDark ? "#FFFFFF" : "#1A1A1A"} />
        {unread && (
          <View style={[s.bellDot, { backgroundColor: accentColor, borderColor: isDark ? "#000000" : pageBg }]} />
        )}
      </Animated.View>
    </GestureDetector>
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


  const token = useAppSelector((s) => s.user.token);
  const profile = useAppSelector((s) => s.user.profile);
  const appRole = useAppSelector((s) => s.user.appRole);
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";
  const profilePic = profile?.avatar ?? null;
  const unreadNotifications = useNotificationBadge(token);

  const { homeContent, load: reloadHomeContent } = useHomeContent(token, bootstrapReady);
  const userId = profile?.id ?? null;

  const statsQuery = useWeeklyStats(userId);
  const runStatus = useRunStore((s) => s.status);
  const liveRunDistanceMeters = useRunStore((s) => s.distanceMeters);
  const liveRunElapsedSeconds = useRunStore((s) => s.elapsedSeconds);
  const isRunActive = runStatus === "running" || runStatus === "paused";
  const isLoading = statsQuery.isLoading || !bootstrapReady;
  const homeContentLoading = !homeContent;
  const stats = statsQuery.data;
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const programTier = useAppSelector((s) => s.user.programTier);
  const hasTeam = appRole === "team" || appRole === "adult_athlete_team" || appRole === "youth_athlete_team_guardian";
  // Match the tab gate (filterTabsByCapabilities): tracking is shown only when the
  // user actually has a tracking capability. Otherwise a basic-plan adult sees a home
  // card that opens a Tracking screen with no tab and mostly-locked content.
  const canTrack = Boolean(
    capabilities?.progressTracking || capabilities?.teamTracking || capabilities?.runTracking,
  );
  const showTracking = hasTeam || appRole === "coach" || canTrack;

  const greeting = useMemo(() => getGreeting(), []);
  const streak = useStreakStore((s) => s.currentStreak);
  const freezesAvailable = useStreakStore((s) => s.freezesAvailable);
  const hydrateFromServer = useStreakStore((s) => s.hydrateFromServer);

  const [streakVisible, setStreakVisible] = useState(false);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [activeMilestoneDay, setActiveMilestoneDay] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Hydrate streak from server on boot, then open modal if needed
  useEffect(() => {
    if (!bootstrapReady || !token) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = async () => {
      try {
        const result = await apiRequest<{
          currentStreak: number;
          longestStreak: number;
          totalDays: number;
          totalSessions: number;
          totalMinutes: number;
          completedDates: string[];
          freezesAvailable: number;
          freezesUsedDates: string[];
          timezone: string | null;
          lastActivityDate: string | null;
        }>("/streaks/me", { token });
        if (!cancelled && result) {
          hydrateFromServer(result);
        }
      } catch {
        // non-critical
      }

      if (cancelled) return;

      const storeState = useStreakStore.getState();
      if (storeState.shouldShowMilestone()) {
        setActiveMilestoneDay(storeState.currentStreak);
        const timer = setTimeout(() => { if (!cancelled) setMilestoneVisible(true); }, 800);
        timers.push(timer);
      } else if (storeState.shouldShowStreak()) {
        const timer = setTimeout(() => { if (!cancelled) setStreakVisible(true); }, 600);
        timers.push(timer);
      }

      // Schedule daily local reminder
      void scheduleStreakReminder(storeState.currentStreak);
    };

    void run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [bootstrapReady, token]);


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.home.all() }),
        reloadHomeContent(true),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, reloadHomeContent]);

  const navigateToProgress = useCallback(() => {
    if (capabilities?.progressTracking === false) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/progress" as any);
  }, [router, capabilities]);

  const navigateToTracking2 = useCallback(() => {
    if (!showTracking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/tracking" as any);
  }, [router, showTracking]);

  const navigateToSchedule = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/schedule" as any);
  }, [router]);

  const navigateToNotifications = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/notifications" as any);
  }, [router]);


  if (isLoading) {
    return (
      <View style={[s.screen, { backgroundColor: isDark ? "#000000" : p.pageBg, paddingTop: insets.top }]}>
        <SkeletonHomeScreen />
      </View>
    );
  }

  const liveDistance = isRunActive ? liveRunDistanceMeters : 0;
  const liveTime = isRunActive ? liveRunElapsedSeconds : 0;
  const draftDistance = stats?.draftDistance ?? 0;
  const draftTime = stats?.draftTime ?? 0;
  const draftRuns = stats?.draftRuns ?? 0;
  const totalDist = (stats?.totalDistance ?? 0) - draftDistance + Math.max(draftDistance, liveDistance);
  const totalTime = (stats?.totalTime ?? 0) - draftTime + Math.max(draftTime, liveTime);
  const numRuns = (stats?.numRuns ?? 0) - draftRuns + Math.max(draftRuns, isRunActive && liveTime > 0 ? 1 : 0);
  const accentLime = t.accent;

  const heroGradientMid = isDark ? "rgba(0,0,0,0.6)" : "rgba(244,250,242,0.6)";
  const heroGradientEnd = isDark ? "#000000" : p.pageBg;
  const heroTextColor = isDark ? "#FFFFFF" : p.textPrimary;
  const heroSubColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  return (
    <View style={[s.screen, { backgroundColor: isDark ? "#000000" : p.pageBg }]}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentLime} />}
        style={{ backgroundColor: isDark ? "#000000" : p.pageBg }}
      >
        {/* ── Hero with background image ── */}
        <View style={[s.hero, { height: HERO_HEIGHT + insets.top }]}>
          <Image source={HOME_BG} style={s.heroBgImage} contentFit="cover" cachePolicy="memory" />
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
                  <Image source={{ uri: profilePic }} style={[s.avatar, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }]} contentFit="cover" cachePolicy="memory-disk" />
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
                <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(400).duration(400)}>
                  <StreakIndicator
                    streak={streak}
                    freezesAvailable={freezesAvailable}
                    reduceMotion={reduceMotion}
                    onPress={() => setStreakVisible(true)}
                  />
                </Animated.View>
                <BellButton
                  onPress={navigateToNotifications}
                  unread={unreadNotifications > 0}
                  isDark={isDark}
                  accentColor={accentLime}
                  pageBg={p.pageBg}
                />
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
            </View>
          )}

          {/* Quick links */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(500).duration(300)}>
            <QuickLinksSection appRole={appRole} capabilities={capabilities} programTier={programTier} />
          </Animated.View>

          {/* Intro video */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(560).duration(300)}>
            <IntroVideoSection
              video={pickIntroVideoForAudience(
                homeContent?.introVideos,
                audienceFromAppRole(appRole),
                homeContent?.introVideoUrl,
              )}
              heroPosterUrl={homeContent?.heroImageUrl}
              loading={homeContentLoading}
            />
          </Animated.View>

          {/* Coach story */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(620).duration(300)}>
            <AdminStorySection story={homeContent?.adminStory} photoUrl={homeContent?.professionalPhoto} loading={homeContentLoading} />
          </Animated.View>

          {/* Testimonials */}
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(680).duration(300)}>
            <TestimonialsSection items={homeContent?.testimonials} loading={homeContentLoading} />
          </Animated.View>
        </View>
      </Animated.ScrollView>

      <StreakModal
        visible={streakVisible}
        onClose={() => setStreakVisible(false)}
        firstName={firstName}
      />
      <StreakMilestoneModal
        visible={milestoneVisible}
        onClose={() => {
          setMilestoneVisible(false);
          useStreakStore.getState().markMilestoneShown(activeMilestoneDay);
        }}
        milestoneDay={activeMilestoneDay}
        firstName={firstName}
      />
      <PermissionPromptSheet />
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  streakIndicator: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    minWidth: 40,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  streakCount: {
    fontFamily: "Outfit-Bold",
    fontSize: 13,
    letterSpacing: -0.3,
    lineHeight: 14,
  },
  streakFreezeDot: {
    position: "absolute",
    top: 2,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  streakFreezeDotText: {
    fontSize: 8,
    fontFamily: "Outfit-Bold",
    color: "#5AC8FA",
    lineHeight: 10,
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

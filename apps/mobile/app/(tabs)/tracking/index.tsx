import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View, Image as RNImage, Dimensions, useWindowDimensions, type StyleProp, type TextStyle } from "react-native";
import { SkeletonTrackingSocialScreen } from "@/components/ui/legacy-skeleton";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { spacing } from "@/constants/theme";
import { trackingScrollBottomPad } from "@/lib/tracking/mainTabBarInset";
import { TrackingHeaderTabs } from "@/components/tracking/TrackingHeaderTabs";
import {
  getRecentRuns,
  getWeeklySummaries,
  initSQLiteRuns,
  RunRecord,
} from "@/lib/sqliteRuns";
import { formatDurationClock, formatHoursMinutes } from "@/lib/tracking/runUtils";
import { useRunStore } from "@/store/useRunStore";
import { ActiveRunBanner } from "@/components/tracking/ActiveRunBanner";
import { useAppSelector } from "@/store/hooks";
import { ActiveRunSportSheet, type SportId } from "@/components/tracking/active-run/ActiveRunSportSheet";
import type { ManagedAthlete } from "@/store/slices/userSlice";
import {
  canAccessTrackingTab,
  shouldUseTeamTrackingFeatures,
} from "@/lib/tracking/teamTrackingGate";
import {
  fetchLeaderboard,
  fetchRunFeed,
  type SocialLeaderboardItem,
  type SocialRunFeedItem,
} from "@/services/tracking/socialService";
import { fetchTeamLocations, type UserLocation } from "@/services/tracking/locationService";
import { relativeTime } from "@/lib/tracking/relativeTime";
import { apiRequest } from "@/lib/api";
import { useSafePathname } from "@/hooks/navigation/useSafeExpoRouter";
import TrackingSocialScreen from "./social";
import {
  Play,
  TrendingUp,
  ChevronRight,
  CheckCircle,
  ShieldCheck,
  CloudOff,
  Zap,
  Moon,
  Users,
  Gauge,
  Clock,
  Calendar,
  Megaphone,
  ClipboardList,
  MessageCircle,
  Trophy,
  Settings,
  MapPin,
  Flame,
  Bell,
  Route,
  Timer,
} from "lucide-react-native";
import { useStreakStore } from "@/lib/streakStore";

const TRACKING_BG = require("@/assets/images/trakcing-bg.png");
const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = SCREEN_H * 0.44;

const SPORT_CATEGORIES: { label: string; icon: string; sports: string[] }[] = [
  { label: "Foot Sports", icon: "shoe-sneaker", sports: ["run", "trail_run", "walk", "hike", "virtual_run", "treadmill"] },
  { label: "Cycle Sports", icon: "bike", sports: ["ride"] },
  { label: "Water Sports", icon: "swim", sports: ["swim"] },
];

// ── AnimatedStat — Strava-style count-up number ────────────────────────────

function AnimatedStat({
  value,
  suffix = "",
  decimals = 0,
  style,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  style?: StyleProp<TextStyle>;
}) {
  const animValue = useSharedValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    animValue.value = 0;
    animValue.value = withTiming(value, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  useAnimatedReaction(
    () => animValue.value,
    (current) => {
      const formatted =
        decimals > 0 ? current.toFixed(decimals) : String(Math.round(current));
      runOnJS(setDisplay)(formatted);
    },
  );

  return (
    <Text style={style}>
      {display}
      {suffix}
    </Text>
  );
}

export default function TrackingHomeScreen() {
  const router = useRouter();
  const pathname = useSafePathname("");
  const insets = useAppSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const p = useAdminPastel();
  const appRole = useAppSelector((s) => s.user.appRole);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);
  const userId = useAppSelector((s) => s.user.profile.id ?? null);
  const token = useAppSelector((s) => s.user.token);
  const profile = useAppSelector((s) => s.user.profile);
  const streak = useStreakStore((s) => s.currentStreak);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";
  const profilePic = profile?.avatar ?? null;

  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState(() => getWeeklySummaries(new Date(), userId));

  type TrackingGoal = {
    id: number;
    title: string;
    description: string | null;
    unit: "km" | "sec" | "min" | "reps" | "custom";
    customUnit: string | null;
    targetValue: number;
    dueDate: string | null;
    createdAt: string | null;
    coachName: string | null;
  };
  const [goals, setGoals] = useState<TrackingGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      apiRequest<{ goals: TrackingGoal[] }>("/tracking/goals")
        .then((r) => setGoals(r.goals))
        .catch(() => {});
    }, []),
  );

  const fabScale = useSharedValue(1);
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const reload = useCallback(() => {
    try {
      setRuns(getRecentRuns(80, userId));
      setWeeklyStats(getWeeklySummaries(new Date(), userId));
    } catch {
      setRuns([]);
      setWeeklyStats({ totalDistance: 0, totalTime: 0, numRuns: 0 });
    }
  }, [userId]);

  useEffect(() => {
    initSQLiteRuns();
    const task = requestAnimationFrame(() => { reload(); });
    return () => cancelAnimationFrame(task);
  }, [reload]);

  const weeklyTime = formatHoursMinutes(weeklyStats.totalTime);
  const formatKm = (meters: number) => (meters / 1000).toFixed(1);

  const last12WeeksKm = useMemo(() => {
    const now = new Date();
    const weekStart = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const mondayOffset = (day + 6) % 7;
      date.setDate(date.getDate() - mondayOffset);
      date.setHours(0, 0, 0, 0);
      return date;
    };
    const thisWeekStart = weekStart(now);
    const buckets = new Array(12).fill(0);
    runs.forEach((r) => {
      const ws = weekStart(new Date(r.date));
      const diffWeeks = Math.floor(
        (thisWeekStart.getTime() - ws.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      if (diffWeeks >= 0 && diffWeeks < 12) {
        buckets[11 - diffWeeks] += r.distance_meters / 1000;
      }
    });
    return buckets.map((v) => Number(v.toFixed(1)));
  }, [runs]);

  const capabilities = useAppSelector((s) => s.user.capabilities);
  const capabilitiesLoaded = useAppSelector((s) => s.user.capabilitiesLoaded);
  const canAccessTracking = canAccessTrackingTab({
    appRole,
    capabilities,
    authTeamMembership,
    firstManagedAthlete: managedAthletes[0] ?? null,
  });
  const isTeamManager = appRole === "team_manager";
  const showTeamTab =
    canAccessTracking &&
    shouldUseTeamTrackingFeatures({
      appRole,
      authTeamMembership,
      firstManagedAthlete: managedAthletes[0] ?? null,
    });

  const categorizedRuns = useMemo(() => {
    const sections: { label: string; icon: string; data: RunRecord[] }[] = [];
    for (const cat of SPORT_CATEGORIES) {
      const matching = runs.filter((r) => cat.sports.includes(r.sport ?? "run"));
      if (matching.length > 0) {
        sections.push({ label: cat.label, icon: cat.icon, data: matching });
      }
    }
    // Uncategorized (sport is null/unknown and not in any category)
    const allCategorizedSports = SPORT_CATEGORIES.flatMap((c) => c.sports);
    const uncategorized = runs.filter((r) => !allCategorizedSports.includes(r.sport ?? "run"));
    if (uncategorized.length > 0) {
      sections.push({ label: "Other", icon: "run", data: uncategorized });
    }
    return sections;
  }, [runs]);

  const hasCategorized = categorizedRuns.length > 1 || (categorizedRuns.length === 1 && categorizedRuns[0]!.label !== "Foot Sports");

  const latestRun = runs[0] ?? null;
  const weeklyRunCountLabel = `${weeklyStats.numRuns} ${weeklyStats.numRuns === 1 ? "run" : "runs"} this week`;
  const averageRunDistanceKm =
    weeklyStats.numRuns > 0
      ? (weeklyStats.totalDistance / weeklyStats.numRuns / 1000).toFixed(1)
      : "0.0";
  const lastRunLabel = latestRun
    ? `Last ${new Date(latestRun.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : "No runs yet";

  const runStatus = useRunStore((s) => s.status);
  const [refreshing, setRefreshing] = useState(false);
  const [sportSheetOpen, setSportSheetOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportId>("run");
  useFocusEffect(
    useCallback(() => {
      const status = useRunStore.getState().status;
      if (status === "running" || status === "paused") {
        router.replace("/active-run" as any);
      }
    }, [router]),
  );

  const handleStartRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (runStatus === "running" || runStatus === "paused") {
      router.replace("/active-run" as any);
      return;
    }
    setSportSheetOpen(true);
  }, [router, runStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reload();
    apiRequest<{ goals: TrackingGoal[] }>("/tracking/goals")
      .then((r) => setGoals(r.goals))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [reload]);

  const fabTap = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      fabScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      fabScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handleStartRun)();
    });

  useEffect(() => {
    if (!capabilitiesLoaded || canAccessTracking) return;
    router.replace("/(tabs)");
  }, [capabilitiesLoaded, canAccessTracking, router]);

  if (pathname.includes("/tracking/social")) {
    return <TrackingSocialScreen />;
  }

  if (!capabilitiesLoaded || !canAccessTracking) return null;

  if (isTeamManager) {
    return (
      <ManagerDashboard
        isDark={isDark}
        insets={insets}
        showTeamTab={showTeamTab}
        token={token}
        managedAthletes={managedAthletes}
        authTeamMembership={authTeamMembership}
        router={router}
      />
    );
  }

  const bentoGap = 10;
  const bentoHalf = (screenWidth - spacing.xl * 2 - bentoGap) / 2;

  const PASTEL_MINT = "#2F9F3D";
  const PASTEL_MINT_TEXT = "#FFFFFF";
  const PASTEL_PEACH = "#2F9F3D";
  const PASTEL_PEACH_TEXT = "#FFFFFF";
  const PASTEL_LAVENDER = "#2F9F3D";
  const PASTEL_LAVENDER_TEXT = "#FFFFFF";
  const PASTEL_SKY = "#2F9F3D";
  const PASTEL_SKY_TEXT = "#FFFFFF";
  const PASTEL_ROSE = "#2F9F3D";
  const PASTEL_ROSE_TEXT = "#FFFFFF";

  return (
    <>
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: trackingScrollBottomPad(insets) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={p.accent}
            colors={[p.accent]}
          />
        }
      >
        {/* ── Hero Header ── */}
        <View style={{ height: HERO_H + insets.top, overflow: "hidden" }}>
          <RNImage source={TRACKING_BG} style={{ position: "absolute", width: "100%", height: "100%", resizeMode: "cover" }} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.45)", p.pageBg]}
            locations={[0.25, 0.65, 1]}
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />

          <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: spacing.xl, justifyContent: "space-between" }}>
            {/* Top bar */}
            <Animated.View entering={FadeIn.delay(100).duration(400)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {profilePic ? (
                  <RNImage source={{ uri: profilePic }} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }} />
                ) : (
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: "#fff" }}>{firstName[0]}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {streak > 0 && (
                  <Animated.View entering={FadeIn.delay(400).duration(400)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 }}>
                    <Flame size={13} color="#FF9500" fill="#FF9500" />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: "#fff" }}>{streak}</Text>
                  </Animated.View>
                )}
                <Pressable onPress={() => router.push("/notifications" as any)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Bell size={18} color="#fff" />
                  <View style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: p.accent }} />
                </Pressable>
              </View>
            </Animated.View>

            {/* Hero text */}
            <View style={{ gap: 6, paddingBottom: 20 }}>
              <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: "rgba(255,255,255,0.7)" }}>
                Your Training
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={{ fontFamily: "Outfit-Bold", fontSize: 38, color: "#fff", letterSpacing: -1.5, lineHeight: 42 }}>
                Dashboard
              </Animated.Text>

              {/* Glass stat pills */}
              <Animated.View entering={FadeInRight.delay(500).duration(500).springify().damping(16)} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Route size={14} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>
                      {(weeklyStats.totalDistance / 1000).toFixed(1)}
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>km</Text>
                  </View>
                </BlurView>
                <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Timer size={14} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>
                      {weeklyTime.h}h {weeklyTime.m}m
                    </Text>
                  </View>
                </BlurView>
                <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Zap size={14} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>
                      {weeklyStats.numRuns}
                    </Text>
                  </View>
                </BlurView>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: 16 }}>
          <TrackingHeaderTabs
            active="running"
            colors={{ accent: p.accent, background: p.pageBg, card: p.cardWhite, textSecondary: p.textSecondary } as any}
            isDark={isDark}
            topInset={0}
            paddingHorizontal={0}
            showTeamTab={showTeamTab}
          />
          <ActiveRunBanner />
        </View>

        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: 14 }}>

          {/* ── Training Goals ── */}
          {goals.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, letterSpacing: 0.8, color: p.textMuted, textTransform: "uppercase", paddingHorizontal: 4 }}>
                Goals
              </Text>
              {goals.map((goal, gi) => {
                const unitLabel = goal.unit === "custom" ? (goal.customUnit ?? "") : goal.unit;
                const dueLabel = goal.dueDate
                  ? `Due ${new Date(goal.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : null;

                const goalStart = goal.createdAt ? new Date(goal.createdAt).getTime() : 0;
                let progress = 0;
                if (goal.unit === "km") {
                  const totalMeters = runs
                    .filter((r) => new Date(r.date).getTime() >= goalStart)
                    .reduce((sum, r) => sum + r.distance_meters, 0);
                  progress = totalMeters / 1000;
                } else if (goal.unit === "min") {
                  const totalSec = runs
                    .filter((r) => new Date(r.date).getTime() >= goalStart)
                    .reduce((sum, r) => sum + r.duration_seconds, 0);
                  progress = totalSec / 60;
                } else if (goal.unit === "sec") {
                  progress = runs
                    .filter((r) => new Date(r.date).getTime() >= goalStart)
                    .reduce((sum, r) => sum + r.duration_seconds, 0);
                }
                const hasMeasurableProgress = goal.unit === "km" || goal.unit === "min" || goal.unit === "sec";
                const pct = hasMeasurableProgress ? Math.min(1, progress / goal.targetValue) : null;
                const done = pct != null && pct >= 1;
                const barColor = done ? PASTEL_MINT_TEXT : p.accent;
                const cardBg = done ? PASTEL_MINT : p.cardWhite;

                const progressLabel = hasMeasurableProgress
                  ? goal.unit === "km"
                    ? `${progress.toFixed(1)} / ${goal.targetValue} km`
                    : goal.unit === "min"
                    ? `${Math.round(progress)} / ${goal.targetValue} min`
                    : `${Math.round(progress)} / ${goal.targetValue} sec`
                  : null;

                const RING_SIZE = 90;
                const RING_STROKE = 7;
                const ringRadius = (RING_SIZE - RING_STROKE) / 2;
                const ringCircumference = 2 * Math.PI * ringRadius;
                const ringOffset = pct != null ? ringCircumference * (1 - pct) : ringCircumference;
                const ringTrackColor = done ? "rgba(46,125,50,0.15)" : p.accentSoft;

                return (
                  <Animated.View
                    key={goal.id}
                    entering={FadeInDown.delay(gi * 60).springify().damping(18)}
                    style={{
                      backgroundColor: cardBg,
                      borderRadius: 28,
                      padding: 20,
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
                      <Svg width={RING_SIZE} height={RING_SIZE}>
                        <Circle
                          cx={RING_SIZE / 2}
                          cy={RING_SIZE / 2}
                          r={ringRadius}
                          stroke={ringTrackColor}
                          strokeWidth={RING_STROKE}
                          fill="none"
                        />
                        {pct != null && (
                          <Circle
                            cx={RING_SIZE / 2}
                            cy={RING_SIZE / 2}
                            r={ringRadius}
                            stroke={barColor}
                            strokeWidth={RING_STROKE}
                            fill="none"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                            strokeLinecap="round"
                            rotation={-90}
                            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                          />
                        )}
                      </Svg>
                      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
                        {done ? (
                          <CheckCircle size={32} color={PASTEL_MINT_TEXT} />
                        ) : pct != null ? (
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: barColor, letterSpacing: -0.5 }}>
                            {Math.round(pct * 100)}%
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={{ alignItems: "center", gap: 4 }}>
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, letterSpacing: -0.4, textAlign: "center" }}>
                        {goal.title}
                      </Text>
                      {goal.description ? (
                        <Text numberOfLines={2} style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, textAlign: "center" }}>
                          {goal.description}
                        </Text>
                      ) : null}
                      {progressLabel ? (
                        <Text style={{ fontFamily: "Outfit-Medium", fontSize: 13, color: barColor, marginTop: 2 }}>
                          {progressLabel}
                        </Text>
                      ) : null}
                      {!done && (
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: barColor, letterSpacing: -0.5, marginTop: 2 }}>
                          {goal.targetValue} {unitLabel}
                        </Text>
                      )}
                      {done && (
                        <View style={{ backgroundColor: "rgba(46,125,50,0.12)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, marginTop: 4 }}>
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: PASTEL_MINT_TEXT }}>Completed</Text>
                        </View>
                      )}
                    </View>

                    {(dueLabel || goal.coachName) && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      {dueLabel && (
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
                          {dueLabel}
                        </Text>
                      )}
                      {goal.coachName && (
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
                          by {goal.coachName}
                        </Text>
                      )}
                    </View>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          )}

          {/* ── Bento Hero: Distance (full width, tall) ── */}
          <Animated.View
            entering={FadeInDown.delay(0).springify().damping(18)}
            style={{
              backgroundColor: PASTEL_MINT,
              borderRadius: 28,
              padding: 24,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: PASTEL_MINT_TEXT,
                  textTransform: "uppercase",
                  opacity: 0.7,
                }}
              >
                This Week
              </Text>
              <View style={{ backgroundColor: "rgba(46,125,50,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: PASTEL_MINT_TEXT }}>
                  {weeklyRunCountLabel}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
              <AnimatedStat
                value={weeklyStats.totalDistance / 1000}
                decimals={1}
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 64,
                  lineHeight: 68,
                  color: PASTEL_MINT_TEXT,
                  letterSpacing: -2,
                }}
              />
              <Text
                style={{
                  fontFamily: "Outfit-Medium",
                  fontSize: 22,
                  color: PASTEL_MINT_TEXT,
                  opacity: 0.6,
                  paddingBottom: 12,
                }}
              >
                km
              </Text>
            </View>

            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: PASTEL_MINT_TEXT, opacity: 0.6 }}>
              total distance covered
            </Text>
          </Animated.View>

          {/* ── Bento Row: Time + Avg (two halves) ── */}
          <View style={{ flexDirection: "row", gap: bentoGap }}>
            <Animated.View
              entering={FadeInDown.delay(60).springify().damping(18)}
              style={{
                width: bentoHalf,
                backgroundColor: PASTEL_PEACH,
                borderRadius: 24,
                padding: 18,
                gap: 6,
                justifyContent: "space-between",
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(51,105,30,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Clock size={18} color={PASTEL_PEACH_TEXT} />
              </View>
              <View style={{ gap: 2, marginTop: 8 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 28, color: PASTEL_PEACH_TEXT, letterSpacing: -1 }}>
                  {weeklyTime.h}h {weeklyTime.m}m
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_PEACH_TEXT, opacity: 0.6 }}>
                  Time
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(120).springify().damping(18)}
              style={{
                width: bentoHalf,
                backgroundColor: PASTEL_LAVENDER,
                borderRadius: 24,
                padding: 18,
                gap: 6,
                justifyContent: "space-between",
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(27,94,32,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Gauge size={18} color={PASTEL_LAVENDER_TEXT} />
              </View>
              <View style={{ gap: 2, marginTop: 8 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 28, color: PASTEL_LAVENDER_TEXT, letterSpacing: -1 }}>
                  {averageRunDistanceKm}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_LAVENDER_TEXT, opacity: 0.6 }}>
                  km / run avg
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* ── Bento Row: Status + Runs count ── */}
          <View style={{ flexDirection: "row", gap: bentoGap }}>
            <Animated.View
              entering={FadeInDown.delay(180).springify().damping(18)}
              style={{
                flex: 2,
                backgroundColor: PASTEL_SKY,
                borderRadius: 24,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(46,125,50,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Zap size={22} color={PASTEL_SKY_TEXT} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: PASTEL_SKY_TEXT, letterSpacing: -0.5 }}>
                  {weeklyStats.numRuns > 0 ? "Active" : "Ready"}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_SKY_TEXT, opacity: 0.6 }}>
                  Status
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(240).springify().damping(18)}
              style={{
                flex: 1,
                backgroundColor: PASTEL_ROSE,
                borderRadius: 24,
                padding: 18,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 32, color: PASTEL_ROSE_TEXT, letterSpacing: -1 }}>
                {weeklyStats.numRuns}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: PASTEL_ROSE_TEXT, opacity: 0.6 }}>
                runs
              </Text>
            </Animated.View>
          </View>

          {/* ── Weekly Distance Chart (bento card) ── */}
          <Animated.View
            entering={FadeInDown.delay(300).springify().damping(18)}
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 28,
              padding: 22,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, letterSpacing: -0.5 }}>
                  Weekly Distance
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
                  Last 12 weeks
                </Text>
              </View>
              <View style={{ backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent }}>
                  {lastRunLabel}
                </Text>
              </View>
            </View>
            <LineChart
              width={Math.max(260, screenWidth - spacing.xl * 2 - 44)}
              height={110}
              points={last12WeeksKm}
              color={p.accent}
              gridColor={p.divider}
            />
          </Animated.View>

          {/* ── Progress Shortcut (bento link card) ── */}
          <Animated.View entering={FadeInDown.delay(360).springify().damping(18)}>
            <Pressable
              onPress={() => router.push("/progress" as any)}
              style={({ pressed }) => ({
                backgroundColor: PASTEL_LAVENDER,
                borderRadius: 24,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: "rgba(27,94,32,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingUp size={20} color={PASTEL_LAVENDER_TEXT} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: PASTEL_LAVENDER_TEXT, letterSpacing: -0.3 }}>
                    Progress Tracking
                  </Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_LAVENDER_TEXT, opacity: 0.6 }}>
                    Strength · Weight · Body
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={PASTEL_LAVENDER_TEXT} />
            </Pressable>
          </Animated.View>

          {/* ── Activities (categorized runs) ── */}
          {capabilities?.runTracking !== false && <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, letterSpacing: 0.8, color: p.textMuted, textTransform: "uppercase" }}>
                Activities
              </Text>
              <View style={{ backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent }}>
                  {runs.length} total
                </Text>
              </View>
            </View>

            {runs.length === 0 ? (
              <TrackingEmptyState onStartRun={handleStartRun} p={p} />
            ) : hasCategorized ? (
              <View style={{ gap: 14 }}>
                {categorizedRuns.map((section) => (
                  <View key={section.label} style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
                      <Zap size={14} color={p.accent} />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.8, color: p.textMuted, textTransform: "uppercase" }}>
                        {section.label}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: p.cardWhite, borderRadius: 24, overflow: "hidden" }}>
                      {section.data.slice(0, 5).map((run, idx) => (
                        <RunRow
                          key={run.id}
                          run={run}
                          idx={idx}
                          total={Math.min(section.data.length, 5)}
                          p={p}
                          formatKm={formatKm}
                          onPress={() => router.push(`/(tabs)/tracking/run-path/${encodeURIComponent(run.id)}` as any)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ backgroundColor: p.cardWhite, borderRadius: 24, overflow: "hidden" }}>
                {runs.slice(0, 6).map((run, idx) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    idx={idx}
                    total={Math.min(runs.length, 6)}
                    p={p}
                    formatKm={formatKm}
                    onPress={() => router.push(`/(tabs)/tracking/run-path/${encodeURIComponent(run.id)}` as any)}
                  />
                ))}
              </View>
            )}
          </View>}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      {capabilities?.runTracking !== false && <View
        style={{
          position: "absolute",
          bottom: trackingScrollBottomPad(insets) + 20,
          right: 20,
          zIndex: 99,
          opacity: sportSheetOpen ? 0 : 1,
        }}
      >
        <GestureDetector gesture={fabTap}>
          <Animated.View
            style={[fabAnimatedStyle, {
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: p.accent,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: p.accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 8,
            }]}
            accessibilityRole="button"
            accessibilityLabel="Start run"
          >
            <Play size={28} color={p.buttonPrimaryText} style={{ marginLeft: 4 }} />
          </Animated.View>
        </GestureDetector>
      </View>}
    </View>

    <ActiveRunSportSheet
      open={sportSheetOpen}
      selectedSport={selectedSport}
      onSelect={(sport) => {
        setSelectedSport(sport);
        setSportSheetOpen(false);
        const store = useRunStore.getState();
        store.resetRun();
        store.setDestination(null);
        store.setGoalKm(null);
        store.setProgressNotifyEveryMeters(null);
        store.startRun();
        store.pauseRun();
        router.push("/active-run" as any);
      }}
      onClose={() => setSportSheetOpen(false)}
      colors={{ accent: p.accent, background: p.pageBg, card: p.cardWhite, textSecondary: p.textSecondary } as any}
    />
    </>
  );
}

// ── RunRow ───────────────────────────────────────────────────────────────────

function RunRow({
  run,
  idx,
  total,
  p,
  formatKm,
  onPress,
}: {
  run: RunRecord;
  idx: number;
  total: number;
  p: ReturnType<typeof useAdminPastel>;
  formatKm: (m: number) => string;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(idx, 10) * 50).springify().damping(15)}>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: pressed ? p.accentSoft : "transparent",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: p.accent, opacity: 0.55 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary }}>
                {formatKm(run.distance_meters)}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
                km
              </Text>
            </View>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 1 }}>
              {new Date(run.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textSecondary }}>
          {formatDurationClock(run.duration_seconds)}
        </Text>
      </View>

      {idx < total - 1 && (
        <View style={{ position: "absolute", bottom: 0, left: 35, right: 20, height: 1, backgroundColor: p.divider }} />
      )}
    </Pressable>
    </Animated.View>
  );
}

// ── MetricTile ──────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  bg,
  accent,
  textPrimary,
  valueIsAccent = false,
}: {
  label: string;
  value: string;
  bg: string;
  accent: string;
  textPrimary: string;
  valueIsAccent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 14,
          color: valueIsAccent ? accent : textPrimary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── LineChart ────────────────────────────────────────────────────────────────

function LineChart({
  width,
  height,
  points,
  color,
  gridColor,
}: {
  width: number;
  height: number;
  points: number[];
  color: string;
  gridColor: string;
}) {
  const pad = 8;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;
  const max = Math.max(1, ...points);
  const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;
  const toX = (i: number) => pad + i * stepX;
  const toY = (v: number) => pad + (1 - v / max) * chartH;
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");

  return (
    <Svg width={width} height={height}>
      {/* Grid baseline */}
      <Path
        d={`M ${pad} ${height - pad} L ${width - pad} ${height - pad}`}
        stroke={gridColor}
        strokeWidth={1}
      />
      {/* Line */}
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((v, i) => (
        <Circle
          key={i}
          cx={toX(i)}
          cy={toY(v)}
          r={3}
          fill={color}
          opacity={v === 0 ? 0.2 : 1}
        />
      ))}
    </Svg>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

function TrackingEmptyState({
  onStartRun,
  p,
}: {
  onStartRun: () => void;
  p: ReturnType<typeof useAdminPastel>;
}) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const emptyStateTap = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onStartRun)();
    });

  return (
    <View
      style={{
        paddingVertical: 40,
        alignItems: "center",
        gap: 12,
      }}
    >
      <Animated.View entering={FadeInDown.duration(500).springify()}>
        <Svg width={96} height={96} viewBox="0 0 100 100" fill="none">
          <Circle cx="50" cy="20" r="10" fill={p.accent} opacity="0.85" />
          <Path d="M50 35 C58 50, 42 65, 48 85" stroke={p.accent} strokeWidth="8" strokeLinecap="round" opacity="0.75" />
          <Path d="M50 35 C38 45, 62 60, 58 85" stroke={p.accent} strokeWidth="8" strokeLinecap="round" opacity="0.4" />
          <Path d="M50 35 L26 46" stroke={p.accent} strokeWidth="8" strokeLinecap="round" opacity="0.65" />
          <Path d="M50 35 L74 26" stroke={p.accent} strokeWidth="8" strokeLinecap="round" opacity="0.65" />
          <Path d="M15 95 L85 95" stroke={p.accent} strokeWidth="3" strokeLinecap="round" opacity="0.25" />
          <Path d="M5 50 L18 50 M10 70 L23 70" stroke={p.accent} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
        </Svg>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(500).springify()} style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary, textAlign: "center" }}>
          Your first run awaits
        </Text>
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary, textAlign: "center", lineHeight: 20, maxWidth: 220 }}>
          Hit start and we'll track every step of the way
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(500).springify()} style={{ width: "100%", paddingTop: 8 }}>
        <GestureDetector gesture={emptyStateTap}>
          <Animated.View
            style={[btnStyle, {
              backgroundColor: p.accent,
              height: 52,
              borderRadius: 100,
              justifyContent: "center",
              alignItems: "center",
            }]}
          >
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.buttonPrimaryText }}>
              Start your first run
            </Text>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

// ── Manager Dashboard ──────────────────────────────────────────────────────

type ManagerFilter = "all" | "active" | "inactive";

type AthleteWithStats = ManagedAthlete & {
  kmTotal: number;
  durationMinutesTotal: number;
  rank: number | null;
  lastRunDate: string | null;
};

function ManagerDashboard({
  isDark,
  insets,
  showTeamTab,
  token,
  managedAthletes,
  authTeamMembership,
  router,
}: {
  isDark: boolean;
  insets: { top: number; bottom: number };
  showTeamTab: boolean;
  token: string | null;
  managedAthletes: ManagedAthlete[];
  authTeamMembership: { team: string | null; teamId: number | null } | null;
  router: ReturnType<typeof useRouter>;
}) {
  const p = useAdminPastel();
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const [filter, setFilter] = useState<ManagerFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [recentRuns, setRecentRuns] = useState<SocialRunFeedItem[]>([]);
  const [liveLocations, setLiveLocations] = useState<UserLocation[]>([]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setFetchError(false);
    try {
      const [lb, runs, locs] = await Promise.all([
        fetchLeaderboard(token, { windowDays: 7, limit: 100, useTeamFeed: true }),
        fetchRunFeed(token, { limit: 50, windowDays: 7, useTeamFeed: true }),
        fetchTeamLocations(token).catch(() => ({ locations: [] as UserLocation[] })),
      ]);
      setLeaderboard(lb?.items ?? []);
      setRecentRuns(runs?.items ?? []);
      setLiveLocations(locs?.locations ?? []);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const athletes: AthleteWithStats[] = useMemo(() => {
    const lbMap = new Map<number, SocialLeaderboardItem>();
    for (const item of leaderboard) lbMap.set(item.userId, item);

    const runsMap = new Map<number, string>();
    for (const run of recentRuns) {
      if (!runsMap.has(run.userId)) runsMap.set(run.userId, run.date);
    }

    return managedAthletes.map((a) => {
      const lb = a.userId ? lbMap.get(a.userId) : undefined;
      return {
        ...a,
        kmTotal: lb?.kmTotal ?? 0,
        durationMinutesTotal: lb?.durationMinutesTotal ?? 0,
        rank: lb?.rank ?? null,
        lastRunDate: (a.userId ? runsMap.get(a.userId) : null) ?? null,
      };
    });
  }, [managedAthletes, leaderboard, recentRuns]);

  const filtered = useMemo(() => {
    let list = [...athletes];
    if (filter === "active") {
      list = list.filter((a) => a.kmTotal > 0);
    } else if (filter === "inactive") {
      list = list.filter((a) => a.kmTotal === 0);
    }
    list.sort((a, b) => b.kmTotal - a.kmTotal);
    return list;
  }, [athletes, filter]);

  const teamTotalKm = useMemo(() => leaderboard.reduce((s, l) => s + l.kmTotal, 0), [leaderboard]);
  const teamTotalMin = useMemo(() => leaderboard.reduce((s, l) => s + l.durationMinutesTotal, 0), [leaderboard]);
  const activeCount = useMemo(() => athletes.filter((a) => a.kmTotal > 0).length, [athletes]);
  const inactiveCount = athletes.length - activeCount;

  const teamName = authTeamMembership?.team ?? managedAthletes[0]?.team ?? "Your Team";

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: trackingScrollBottomPad(insets) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={p.accent}
            colors={[p.accent]}
          />
        }
      >
        <View style={{ paddingHorizontal: spacing.xl }}>
          <TrackingHeaderTabs
            active="running"
            colors={{ accent: p.accent, background: p.pageBg, card: p.cardWhite, textSecondary: p.textSecondary } as any}
            isDark={isDark}
            topInset={insets.top}
            paddingHorizontal={0}
            showTeamTab={showTeamTab}
          />

          {/* Team name */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <ShieldCheck size={18} color={p.accent} />
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 13,
                color: p.textSecondary,
              }}
            >
              {teamName} · Manager View
            </Text>
          </View>
        </View>

        {loading ? (
          <SkeletonTrackingSocialScreen />
        ) : fetchError ? (
          <View style={{ paddingVertical: 60, alignItems: "center", gap: 12, paddingHorizontal: spacing.xl }}>
            <CloudOff size={36} color={p.textMuted} />
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, textAlign: "center" }}>
              Couldn't load team data. Pull down to retry.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: 12 }}>
            {/* ── Overview cards ── */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ManagerStatCard
                label="Team KM"
                value={teamTotalKm.toFixed(1)}
                icon="gauge"
                accent={p.accent}
                p={p}
              />
              <ManagerStatCard
                label="Team Time"
                value={`${Math.floor(teamTotalMin / 60)}h ${Math.round(teamTotalMin % 60)}m`}
                icon="clock"
                accent={p.accent}
                p={p}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ManagerStatCard
                label="Active"
                value={String(activeCount)}
                icon="zap"
                accent={p.success}
                p={p}
              />
              <ManagerStatCard
                label="Inactive"
                value={String(inactiveCount)}
                icon="moon"
                accent={p.textMuted}
                p={p}
              />
              <ManagerStatCard
                label="Athletes"
                value={String(managedAthletes.length)}
                icon="users"
                accent={p.accent}
                p={p}
              />
            </View>

            {/* ── Quick Actions ── */}
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 11,
                letterSpacing: 1.2,
                color: p.textMuted,
                textTransform: "uppercase",
                paddingLeft: 4,
                marginTop: 4,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ManagerQuickAction
                icon="calendar"
                label="Schedule"
                accent={p.accent}
                p={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/schedule" as any);
                }}
              />
              <ManagerQuickAction
                icon="megaphone"
                label="Announce"
                accent={p.warning}
                p={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/announcements" as any);
                }}
              />
              <ManagerQuickAction
                icon="clipboard"
                label="Roster"
                accent={p.info}
                p={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/team-manager/roster" as any);
                }}
              />
              <ManagerQuickAction
                icon="chat"
                label="Chat"
                accent={p.info}
                p={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/messages" as any);
                }}
              />
            </View>

            {/* ── Live athletes sharing location ── */}
            {liveLocations.length > 0 && (
              <>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 11,
                    letterSpacing: 1.2,
                    color: p.textMuted,
                    textTransform: "uppercase",
                    paddingLeft: 4,
                    marginTop: 4,
                  }}
                >
                  Live Now · {liveLocations.length} {liveLocations.length === 1 ? "athlete" : "athletes"}
                </Text>
                <View
                  style={{
                    backgroundColor: p.cardWhite,
                    borderRadius: 22,
                    overflow: "hidden",
                  }}
                >
                  {liveLocations.map((loc, idx) => {
                    const minutesAgo = Math.floor(
                      (Date.now() - new Date(loc.recordedAt).getTime()) / 60000,
                    );
                    const isRecent = minutesAgo < 10;
                    return (
                      <View
                        key={loc.userId}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          borderBottomWidth: idx < liveLocations.length - 1 ? 1 : 0,
                          borderBottomColor: p.divider,
                        }}
                      >
                        <View>
                          <ManagerAvatar
                            uri={null}
                            name={loc.name}
                            size={36}
                            accent={p.accent}
                            accentSoft={p.accentSoft}
                          />
                          <View
                            style={{
                              position: "absolute",
                              bottom: -1,
                              right: -1,
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: isRecent ? p.success : p.warning,
                              borderWidth: 2,
                              borderColor: p.cardWhite,
                            }}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: "Outfit-Bold",
                              fontSize: 14,
                              color: p.textPrimary,
                            }}
                          >
                            {loc.name}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Outfit-Regular",
                              fontSize: 12,
                              color: isRecent ? p.success : p.textSecondary,
                            }}
                          >
                            {isRecent ? "Sharing now" : `${minutesAgo}m ago`}
                          </Text>
                        </View>
                        <MapPin
                          size={16}
                          color={isRecent ? p.success : p.textMuted}
                        />
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Filter chips ── */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              {(["all", "active", "inactive"] as ManagerFilter[]).map((f) => {
                const selected = filter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFilter(f);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 100,
                      backgroundColor: selected ? p.accent : p.inputBg,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 12,
                        color: selected ? p.buttonPrimaryText : p.textSecondary,
                        textTransform: "capitalize",
                      }}
                    >
                      {f === "all" ? `All (${athletes.length})` : f === "active" ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Section label ── */}
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 11,
                letterSpacing: 1.2,
                color: p.textMuted,
                textTransform: "uppercase",
                paddingLeft: 4,
                marginTop: 4,
              }}
            >
              Athletes · This Week
            </Text>

            {/* ── Athlete list ── */}
            {filtered.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center", gap: 8 }}>
                {filter === "inactive" ? <Moon size={32} color={p.textMuted} /> : <Zap size={32} color={p.textMuted} />}
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
                  {filter === "inactive" ? "All athletes are active this week" : "No athletes match this filter"}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: p.cardWhite,
                  borderRadius: 22,
                  overflow: "hidden",
                }}
              >
                {filtered.map((athlete, idx) => (
                  <AthleteRow
                    key={athlete.id ?? athlete.userId ?? idx}
                    athlete={athlete}
                    rank={idx + 1}
                    p={p}
                    isLast={idx === filtered.length - 1}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push("/(tabs)/tracking/social" as any);
                    }}
                  />
                ))}
              </View>
            )}

            {/* ── Recent activity feed ── */}
            {recentRuns.length > 0 && (
              <>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 11,
                    letterSpacing: 1.2,
                    color: p.textMuted,
                    textTransform: "uppercase",
                    paddingLeft: 4,
                    marginTop: 8,
                  }}
                >
                  Recent Activity
                </Text>
                <View
                  style={{
                    backgroundColor: p.cardWhite,
                    borderRadius: 22,
                    overflow: "hidden",
                  }}
                >
                  {recentRuns.slice(0, 8).map((run) => (
                    <Pressable
                      key={run.runLogId}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/(tabs)/tracking/run-path/${encodeURIComponent(run.runLogId)}` as any);
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        backgroundColor: pressed ? p.accentSoft : "transparent",
                      })}
                    >
                      <ManagerAvatar
                        uri={run.avatarUrl}
                        name={run.name}
                        size={36}
                        accent={p.accent}
                        accentSoft={p.accentSoft}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: "Outfit-Bold",
                              fontSize: 14,
                              color: p.textPrimary,
                              flex: 1,
                            }}
                          >
                            {run.name}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Outfit-Regular",
                              fontSize: 11,
                              color: p.textMuted,
                            }}
                          >
                            {relativeTime(run.date)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.accent }}>
                            {(run.distanceMeters / 1000).toFixed(1)} km
                          </Text>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
                            {formatDurationClock(run.durationSeconds)}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color={p.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* ── Management links ── */}
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 11,
                letterSpacing: 1.2,
                color: p.textMuted,
                textTransform: "uppercase",
                paddingLeft: 4,
                marginTop: 8,
              }}
            >
              Manage
            </Text>
            <View
              style={{
                backgroundColor: p.cardWhite,
                borderRadius: 22,
                overflow: "hidden",
              }}
            >
              <ManagerLinkRow
                icon="trophy"
                label="Team Feed & Leaderboard"
                subtitle="Posts, challenges, and squad activity"
                accent={p.accent}
                p={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/tracking/social" as any);
                }}
              />
              <ManagerLinkRow
                icon="settings"
                label="Team Tracking Settings"
                subtitle="Privacy, sharing, and visibility"
                accent={p.textSecondary}
                p={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/tracking/team-settings" as any);
                }}
              />
              {capabilities?.schedule && (
                <ManagerLinkRow
                  icon="calendar"
                  label="Team Schedule"
                  subtitle="Training sessions and events"
                  accent={p.info}
                  p={p}
                  isLast
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/schedule" as any);
                  }}
                />
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── ManagerStatCard ────────────────────────────────────────────────────────

const STAT_ICONS = {
  gauge: Gauge,
  clock: Clock,
  zap: Zap,
  moon: Moon,
  users: Users,
} as const;

function ManagerStatCard({
  label,
  value,
  icon,
  accent,
  p,
}: {
  label: string;
  value: string;
  icon: keyof typeof STAT_ICONS;
  accent: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  const IconComp = STAT_ICONS[icon];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.cardWhite,
        borderRadius: 22,
        padding: 14,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: p.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComp size={16} color={accent} />
      </View>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 22,
          color: p.textPrimary,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 10,
          letterSpacing: 0.8,
          color: p.textMuted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── AthleteRow ─────────────────────────────────────────────────────────────

function AthleteRow({
  athlete,
  rank,
  p,
  isLast,
  onPress,
}: {
  athlete: AthleteWithStats;
  rank: number;
  p: ReturnType<typeof useAdminPastel>;
  isLast: boolean;
  onPress: () => void;
}) {
  const isActive = athlete.kmTotal > 0;

  const statusDot = isActive ? p.success : p.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: pressed ? p.accentSoft : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: p.divider,
      })}
    >
      {/* Rank */}
      <View style={{ width: 28, alignItems: "center" }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: rank <= 3 && isActive
              ? rank === 1 ? p.warningSoft : rank === 2 ? p.infoSoft : p.warningSoft
              : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 12,
              color: rank <= 3 && isActive
                ? rank === 1 ? p.warning : rank === 2 ? p.info : p.warning
                : p.textMuted,
            }}
          >
            {rank}
          </Text>
        </View>
      </View>

      {/* Avatar with status dot */}
      <View>
        <ManagerAvatar
          uri={athlete.profilePicture ?? null}
          name={athlete.name ?? "?"}
          size={42}
          accent={p.accent}
          accentSoft={p.accentSoft}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: statusDot,
            borderWidth: 2,
            borderColor: p.cardWhite,
          }}
        />
      </View>

      {/* Name + last activity */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 15,
            color: p.textPrimary,
          }}
        >
          {athlete.name ?? "Unknown"}
        </Text>
        <Text
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 12,
            color: p.textSecondary,
          }}
        >
          {athlete.lastRunDate
            ? `Last run ${relativeTime(athlete.lastRunDate)}`
            : "No runs this week"}
        </Text>
      </View>

      {/* Stats */}
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 15,
            color: isActive ? p.accent : p.textMuted,
          }}
        >
          {athlete.kmTotal.toFixed(1)} km
        </Text>
        <Text
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 11,
            color: p.textMuted,
          }}
        >
          {Math.floor(athlete.durationMinutesTotal / 60)}h {Math.round(athlete.durationMinutesTotal % 60)}m
        </Text>
      </View>

      <ChevronRight size={16} color={p.textMuted} />
    </Pressable>
  );
}

// ── ManagerAvatar ──────────────────────────────────────────────────────────

function ManagerAvatar({
  uri,
  name,
  size,
  accent,
  accentSoft,
}: {
  uri: string | null;
  name: string;
  size: number;
  accent: string;
  accentSoft: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accentSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: size * 0.4,
          color: accent,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

// ── ManagerQuickAction ─────────────────────────────────────────────────────

const QUICK_ACTION_ICONS = {
  calendar: Calendar,
  megaphone: Megaphone,
  clipboard: ClipboardList,
  chat: MessageCircle,
} as const;

function ManagerQuickAction({
  icon,
  label,
  accent,
  p,
  onPress,
}: {
  icon: keyof typeof QUICK_ACTION_ICONS;
  label: string;
  accent: string;
  p: ReturnType<typeof useAdminPastel>;
  onPress: () => void;
}) {
  const IconComp = QUICK_ACTION_ICONS[icon];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: p.cardWhite,
        borderRadius: 22,
        paddingVertical: 14,
        alignItems: "center",
        gap: 8,
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: p.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComp size={18} color={accent} />
      </View>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 11,
          color: p.textSecondary,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── ManagerLinkRow ─────────────────────────────────────────────────────────

const LINK_ICONS = {
  trophy: Trophy,
  settings: Settings,
  calendar: Calendar,
} as const;

function ManagerLinkRow({
  icon,
  label,
  subtitle,
  accent,
  p,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof LINK_ICONS;
  label: string;
  subtitle: string;
  accent: string;
  p: ReturnType<typeof useAdminPastel>;
  isLast?: boolean;
  onPress: () => void;
}) {
  const IconComp = LINK_ICONS[icon];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: pressed ? p.accentSoft : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: p.divider,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: p.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComp size={19} color={accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 14,
            color: p.textPrimary,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 12,
            color: p.textSecondary,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={17} color={p.textMuted} />
    </Pressable>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, View, Dimensions, useWindowDimensions, type StyleProp, type TextStyle } from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { SkeletonTrackingSocialScreen } from "@/components/ui/legacy-skeleton";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
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
import TrackingSocialScreen from "./social";
import {
  getRecentRuns,
  getWeeklySummaries,
  initSQLiteRuns,
  RunRecord,
} from "@/lib/sqliteRuns";
import {
  getBackgroundLocationAllowed,
  setBackgroundLocationAllowed,
} from "@/lib/runTrackingPreferences";
import { Switch } from "react-native";
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
  type SocialLeaderboardItem,
} from "@/services/tracking/socialService";
import { fetchTeamLocations, type UserLocation } from "@/services/tracking/locationService";
import { relativeTime } from "@/lib/tracking/relativeTime";
import { apiRequest } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
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
  Info,
  Share2,
} from "lucide-react-native";
import { useStreakStore } from "@/lib/streakStore";
import { RunShareCard } from "@/components/tracking/RunShareCard";
import { RunDetailOverlay } from "@/components/tracking/RunDetailOverlay";

const TRACKING_BG = require("@/assets/images/trakcing-bg.png");
const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = SCREEN_H * 0.44;

const SPORT_CATEGORIES: { label: string; icon: string; sports: string[] }[] = [
  { label: "Foot Sports", icon: "shoe-sneaker", sports: ["run", "trail_run", "walk", "hike", "virtual_run", "treadmill"] },
  { label: "Cycle Sports", icon: "bike", sports: ["ride"] },
  { label: "Water Sports", icon: "swim", sports: ["swim"] },
];

type RunCoord = { latitude: number; longitude: number; timestamp?: number; altitude?: number | null };

function parseRunCoords(value: string | null | undefined): RunCoord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (point): point is RunCoord =>
        point &&
        typeof point.latitude === "number" &&
        typeof point.longitude === "number",
    );
  } catch {
    return [];
  }
}

function formatRunPace(run: RunRecord): string {
  if (run.avg_pace && run.avg_pace > 0) {
    const mins = Math.floor(run.avg_pace);
    const secs = Math.round((run.avg_pace - mins) * 60);
    return `${mins}:${String(secs).padStart(2, "0")} /km`;
  }
  const km = run.distance_meters / 1000;
  if (km <= 0 || run.duration_seconds <= 0) return "-";
  const secPerKm = run.duration_seconds / km;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

function sportLabel(sport: string | null | undefined): string {
  switch (sport) {
    case "ride":
      return "Ride";
    case "walk":
      return "Walk";
    case "hike":
      return "Hike";
    case "swim":
      return "Swim";
    case "trail_run":
      return "Trail Run";
    case "treadmill":
      return "Treadmill";
    case "virtual_run":
      return "Virtual Run";
    default:
      return "Run";
  }
}

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
  }, [animValue, value]);

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
  const insets = useAppSafeAreaInsets();
  const { width: _screenWidth } = useWindowDimensions();
  const screenWidth = Platform.isPad ? Math.min(_screenWidth, 560) : _screenWidth;
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
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);

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
  const lastGoalsFetchRef = useRef<number>(0);
  const [innerTab, setInnerTab] = useState<"running" | "team">("running");

  const { socket } = useSocket();

  const refreshGoals = useCallback(() => {
    apiRequest<{ goals: TrackingGoal[] }>("/tracking/goals")
      .then((r) => {
        setGoals(r.goals);
        lastGoalsFetchRef.current = Date.now();
      })
      .catch(() => {});
  }, []);

  useFocusEffect(() => {
    const now = Date.now();
    if (now - lastGoalsFetchRef.current > 30 * 1000) {
      void refreshGoals();
    }
  });

  useEffect(() => {
    if (!socket) return;
    socket.on("tracking:goals:changed", refreshGoals);
    return () => { socket.off("tracking:goals:changed", refreshGoals); };
  }, [socket, refreshGoals]);

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
      setWeeklyStats({ totalDistance: 0, totalTime: 0, numRuns: 0, draftDistance: 0, draftTime: 0, draftRuns: 0 });
    }
  }, [userId]);

  useEffect(() => {
    initSQLiteRuns();
    const task = requestAnimationFrame(() => { reload(); });
    return () => cancelAnimationFrame(task);
  }, [reload]);

  const runStatus = useRunStore((s) => s.status);
  const liveRunDistanceMeters = useRunStore((s) => s.distanceMeters);
  const liveRunElapsedSeconds = useRunStore((s) => s.elapsedSeconds);
  const isRunActive = runStatus === "running" || runStatus === "paused";
  const liveDistance = isRunActive ? liveRunDistanceMeters : 0;
  const liveTime = isRunActive ? liveRunElapsedSeconds : 0;
  const draftDistance = weeklyStats.draftDistance ?? 0;
  const draftTime = weeklyStats.draftTime ?? 0;
  const draftRuns = weeklyStats.draftRuns ?? 0;
  const displayWeeklyStats = {
    totalDistance: weeklyStats.totalDistance - draftDistance + Math.max(draftDistance, liveDistance),
    totalTime: weeklyStats.totalTime - draftTime + Math.max(draftTime, liveTime),
    numRuns: weeklyStats.numRuns - draftRuns + Math.max(draftRuns, isRunActive && liveTime > 0 ? 1 : 0),
  };
  const weeklyTime = formatHoursMinutes(displayWeeklyStats.totalTime);
  const weeklyTimeLabel =
    displayWeeklyStats.totalTime > 0 && displayWeeklyStats.totalTime < 60
      ? `${Math.floor(displayWeeklyStats.totalTime)}s`
      : `${weeklyTime.h}h ${weeklyTime.m}m`;
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

  const personalBests = useMemo(() => {
    if (runs.length === 0) return null;
    const bestDist = runs.reduce((b, r) => r.distance_meters > b.distance_meters ? r : b, runs[0]!);
    const pacedRuns = runs.filter((r) => r.avg_pace && r.avg_pace > 0);
    const bestPace = pacedRuns.length > 0
      ? pacedRuns.reduce<RunRecord>((b, r) => r.avg_pace! < b.avg_pace! ? r : b, pacedRuns[0]!)
      : null;
    const bestDur = runs.reduce((b, r) => r.duration_seconds > b.duration_seconds ? r : b, runs[0]!);
    return { bestDist, bestPace, bestDur };
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
  const weeklyRunCountLabel = `${displayWeeklyStats.numRuns} ${displayWeeklyStats.numRuns === 1 ? "run" : "runs"} this week`;
  const averageRunDistanceKm =
    displayWeeklyStats.numRuns > 0
      ? (displayWeeklyStats.totalDistance / displayWeeklyStats.numRuns / 1000).toFixed(1)
      : "0.0";
  const lastRunLabel = latestRun
    ? `Last ${new Date(latestRun.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : "No runs yet";

  const [refreshing, setRefreshing] = useState(false);
  const [sportSheetOpen, setSportSheetOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportId>("run");
  const [shareRun, setShareRun] = useState<RunRecord | null>(null);
  const shareRunCoords = useMemo(() => parseRunCoords(shareRun?.coordinates), [shareRun]);
  useFocusEffect(
    useCallback(() => {
      const status = useRunStore.getState().status;
      if (status === "running" || status === "paused") {
        router.push("/active-run" as any);
      }
    }, [router]),
  );

  const handleStartRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (runStatus === "running" || runStatus === "paused") {
      router.push("/active-run" as any);
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
    // team_manager (team_coach) always has tracking access — never redirect them.
    // This guards against the race where social.tsx pops back and triggers a
    // brief re-render here before Redux state fully settles.
    if (appRole === "team_manager") return;
    if (!capabilitiesLoaded || appRole === null || canAccessTracking) return;
    router.replace("/(tabs)" as any);
  }, [capabilitiesLoaded, appRole, canAccessTracking, router]);

  if (!capabilitiesLoaded || appRole === null || !canAccessTracking) return null;

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

  const PASTEL_MINT = p.cardMint;
  const PASTEL_MINT_TEXT = p.textPrimary;
  const PASTEL_PEACH = p.cardPeach;
  const PASTEL_PEACH_TEXT = p.textPrimary;
  const PASTEL_LAVENDER = p.cardLavender;
  const PASTEL_LAVENDER_TEXT = p.textPrimary;
  const PASTEL_SKY = p.cardSage;
  const PASTEL_SKY_TEXT = p.textPrimary;
  const PASTEL_ROSE = p.cardYellow;
  const PASTEL_ROSE_TEXT = p.textPrimary;
  const BENTO_BORDER = { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" } as const;

  if (innerTab === "team" && showTeamTab) {
    return <TrackingSocialScreen onGoBack={() => setInnerTab("running")} />;
  }

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
          <Image source={TRACKING_BG} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)", isDark ? "rgba(0,0,0,0.95)" : p.pageBg]}
            locations={[0.2, 0.62, 1]}
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />

          <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: spacing.xl, justifyContent: "space-between" }}>
            {/* Top bar */}
            <Animated.View entering={FadeIn.delay(100).duration(400)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
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
              <Animated.View entering={FadeInRight.delay(500).duration(500).duration(300)} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Route size={14} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>
                      {(displayWeeklyStats.totalDistance / 1000).toFixed(1)}
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>km</Text>
                  </View>
                </BlurView>
                <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Timer size={14} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>
                      {weeklyTimeLabel}
                    </Text>
                  </View>
                </BlurView>
                <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Zap size={14} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>
                      {displayWeeklyStats.numRuns}
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
            active={innerTab}
            colors={{ accent: p.accent, background: p.pageBg, card: p.cardWhite, textSecondary: p.textSecondary } as any}
            isDark={isDark}
            topInset={0}
            paddingHorizontal={0}
            showTeamTab={showTeamTab}
            onTabChange={(t) => setInnerTab(t)}
          />
          <ActiveRunBanner />
        </View>

        {capabilities?.runTracking !== false && (
          <BackgroundLocationInfoCard p={p} />
        )}

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
                const barColor = done ? p.accent : p.accent;
                const cardBg = done ? "transparent" : p.cardWhite;

                const progressLabel = hasMeasurableProgress
                  ? goal.unit === "km"
                    ? `${progress.toFixed(1)} / ${goal.targetValue} km`
                    : goal.unit === "min"
                    ? `${Math.round(progress)} / ${goal.targetValue} min`
                    : `${Math.round(progress)} / ${goal.targetValue} sec`
                  : null;

                const RING_SIZE = 56;
                const RING_STROKE = 5;
                const ringRadius = (RING_SIZE - RING_STROKE) / 2;
                const ringCircumference = 2 * Math.PI * ringRadius;
                const ringOffset = pct != null ? ringCircumference * (1 - pct) : ringCircumference;
                const ringTrackColor = done ? "rgba(46,125,50,0.15)" : p.accentSoft;

                return (
                  <Animated.View
                    key={goal.id}
                    entering={FadeInDown.delay(gi * 60).duration(280)}
                    style={{
                      backgroundColor: done ? p.cardMint : p.cardWhite,
                      borderRadius: 22,
                      padding: 16,
                      gap: 12,
                      ...BENTO_BORDER,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                      <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                            <CheckCircle size={20} color={p.accent} />
                          ) : pct != null ? (
                            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: barColor, letterSpacing: -0.3 }}>
                              {Math.round(pct * 100)}%
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary, letterSpacing: -0.3, flex: 1 }} numberOfLines={1}>
                            {goal.title}
                          </Text>
                          {done && (
                            <View style={{ backgroundColor: "rgba(46,125,50,0.12)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginLeft: 8 }}>
                              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent }}>Done</Text>
                            </View>
                          )}
                        </View>
                        {!done && (
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: barColor }}>
                            {goal.targetValue} {unitLabel}
                          </Text>
                        )}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          {dueLabel && <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>{dueLabel}</Text>}
                          {goal.coachName && <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>· {goal.coachName}</Text>}
                        </View>
                      </View>
                    </View>

                    {hasMeasurableProgress && pct != null && (
                      <View style={{ gap: 5 }}>
                        <View style={{ height: 5, borderRadius: 3, backgroundColor: p.accentSoft, overflow: "hidden" }}>
                          <View style={{ height: 5, borderRadius: 3, backgroundColor: barColor, width: `${Math.min(100, pct * 100)}%` }} />
                        </View>
                        {progressLabel && (
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>{progressLabel}</Text>
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
            entering={FadeInDown.delay(0).duration(280)}
            style={{
              backgroundColor: PASTEL_MINT,
              borderRadius: 28,
              padding: 24,
              gap: 8,
              ...BENTO_BORDER,
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
                value={displayWeeklyStats.totalDistance / 1000}
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
              entering={FadeInDown.delay(60).duration(280)}
              style={{
                width: bentoHalf,
                backgroundColor: PASTEL_PEACH,
                borderRadius: 24,
                padding: 18,
                gap: 6,
                justifyContent: "space-between",
                ...BENTO_BORDER,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(51,105,30,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Clock size={18} color={PASTEL_PEACH_TEXT} />
              </View>
              <View style={{ gap: 2, marginTop: 8 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 28, color: PASTEL_PEACH_TEXT, letterSpacing: -1 }}>
                  {weeklyTimeLabel}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_PEACH_TEXT, opacity: 0.6 }}>
                  Time
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(120).duration(280)}
              style={{
                width: bentoHalf,
                backgroundColor: PASTEL_LAVENDER,
                borderRadius: 24,
                padding: 18,
                gap: 6,
                justifyContent: "space-between",
                ...BENTO_BORDER,
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
              entering={FadeInDown.delay(180).duration(280)}
              style={{
                flex: 2,
                backgroundColor: PASTEL_SKY,
                borderRadius: 24,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                ...BENTO_BORDER,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(46,125,50,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Zap size={22} color={PASTEL_SKY_TEXT} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: PASTEL_SKY_TEXT, letterSpacing: -0.5 }}>
                  {displayWeeklyStats.numRuns > 0 ? "Active" : "Ready"}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_SKY_TEXT, opacity: 0.6 }}>
                  Status
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(240).duration(280)}
              style={{
                flex: 1,
                backgroundColor: PASTEL_ROSE,
                borderRadius: 24,
                padding: 18,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                ...BENTO_BORDER,
              }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 32, color: PASTEL_ROSE_TEXT, letterSpacing: -1 }}>
                {displayWeeklyStats.numRuns}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: PASTEL_ROSE_TEXT, opacity: 0.6 }}>
                runs
              </Text>
            </Animated.View>
          </View>

          {/* ── Weekly Distance Chart (bento card) ── */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(280)}
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
            <BarChart
              width={Math.max(260, screenWidth - spacing.xl * 2 - 44)}
              height={110}
              points={last12WeeksKm}
              color={p.accent}
              gridColor={p.divider}
            />
          </Animated.View>

          {/* ── Personal Bests ── */}
          {personalBests && (
            <Animated.View
              entering={FadeInDown.delay(320).duration(280)}
              style={{
                backgroundColor: p.cardLavender,
                borderRadius: 28,
                padding: 20,
                gap: 14,
                ...BENTO_BORDER,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, letterSpacing: 0.8, color: p.textMuted, textTransform: "uppercase" }}>
                  Personal Bests
                </Text>
                <Trophy size={16} color={p.accent} />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <PersonalBestPill
                  label="Longest"
                  value={`${(personalBests.bestDist.distance_meters / 1000).toFixed(1)} km`}
                  p={p}
                />
                {personalBests.bestPace && (
                  <PersonalBestPill
                    label="Best Pace"
                    value={formatRunPace(personalBests.bestPace)}
                    p={p}
                  />
                )}
                <PersonalBestPill
                  label="Duration"
                  value={formatDurationClock(personalBests.bestDur.duration_seconds)}
                  p={p}
                />
              </View>
            </Animated.View>
          )}

          {/* ── Progress Shortcut (bento link card) ── */}
          {capabilities?.progressTracking !== false && <Animated.View entering={FadeInDown.delay(360).duration(280)}>
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
                ...BENTO_BORDER,
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
          </Animated.View>}

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
                    <View style={{ gap: 12 }}>
                      {section.data.slice(0, 5).map((run, idx) => (
                        <WorkoutRunCard
                          key={run.id}
                          run={run}
                          idx={idx}
                          isDark={isDark}
                          p={p}
                          formatKm={formatKm}
                          onPress={() => setSelectedRun(run)}
                          onShare={() => setShareRun(run)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {runs.slice(0, 6).map((run, idx) => (
                  <WorkoutRunCard
                    key={run.id}
                    run={run}
                    idx={idx}
                    isDark={isDark}
                    p={p}
                    formatKm={formatKm}
                    onPress={() => setSelectedRun(run)}
                    onShare={() => setShareRun(run)}
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
        router.push("/active-run" as any);
      }}
      onClose={() => setSportSheetOpen(false)}
      colors={{ accent: p.accent, background: p.pageBg, card: p.cardWhite, textSecondary: p.textSecondary } as any}
    />
    {shareRun ? (
      <RunShareCard
        visible={!!shareRun}
        distanceMeters={shareRun.distance_meters}
        elapsedSeconds={shareRun.duration_seconds}
        coordinates={shareRunCoords}
        onClose={() => setShareRun(null)}
      />
    ) : null}
    <RunDetailOverlay
      run={selectedRun}
      onClose={() => setSelectedRun(null)}
      onShare={(run) => {
        setSelectedRun(null);
        setShareRun(run);
      }}
    />
    </>
  );
}

// ── WorkoutRunCard helpers ───────────────────────────────────────────────────

function effortScoreForRun(run: RunRecord): number {
  if (run.effort_level != null && run.effort_level >= 0) {
    return Math.min(100, Math.max(0, Math.round(run.effort_level * 10)));
  }
  const distanceKm = run.distance_meters / 1000;
  const minutes = run.duration_seconds / 60;
  return Math.min(100, Math.max(8, Math.round(distanceKm * 8 + minutes * 0.45)));
}

function effortLabel(score: number): string {
  if (score >= 80) return "All-out";
  if (score >= 60) return "Hard";
  if (score >= 35) return "Steady";
  return "Easy";
}

function RoutePreview({
  coords,
  isDark,
  accent,
}: {
  coords: RunCoord[];
  isDark: boolean;
  accent: string;
}) {
  const path = useMemo(() => {
    if (coords.length < 2) return "";
    const thin = coords.length > 80
      ? coords.filter((_, i) => i % Math.ceil(coords.length / 80) === 0)
      : coords;
    const sortedLats = [...thin.map((c) => c.latitude)].sort((a, b) => a - b);
    const sortedLngs = [...thin.map((c) => c.longitude)].sort((a, b) => a - b);
    const medLat = sortedLats[Math.floor(sortedLats.length / 2)]!;
    const medLng = sortedLngs[Math.floor(sortedLngs.length / 2)]!;
    const clean = thin.filter(
      (c) => Math.abs(c.latitude - medLat) < 0.05 && Math.abs(c.longitude - medLng) < 0.05,
    );
    if (clean.length < 2) return "";
    const lats = clean.map((c) => c.latitude);
    const lngs = clean.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;
    return clean
      .map((coord, index) => {
        const x = 24 + ((coord.longitude - minLng) / lngRange) * 252;
        const y = 24 + ((maxLat - coord.latitude) / latRange) * 142;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [coords]);

  return (
    <View
      style={{
        height: 190,
        backgroundColor: isDark ? "#1a1a1a" : "#e8e8e8",
        overflow: "hidden",
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 190">
        {path ? (
          <>
            <Path d={path} stroke="rgba(0,0,0,0.12)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={path} stroke={accent} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        ) : null}
      </Svg>
      <View
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          backgroundColor: "rgba(0,0,0,0.52)",
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <MapPin size={12} color="#fff" />
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: "#fff" }}>
          {path ? "Route Preview" : "No GPS data"}
        </Text>
      </View>
    </View>
  );
}

// ── WorkoutRunCard ───────────────────────────────────────────────────────────

function WorkoutRunCard({
  run,
  idx,
  isDark,
  p,
  formatKm,
  onPress,
  onShare,
}: {
  run: RunRecord;
  idx: number;
  isDark: boolean;
  p: ReturnType<typeof useAdminPastel>;
  formatKm: (m: number) => string;
  onPress: () => void;
  onShare: () => void;
}) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const coords = useMemo(() => parseRunCoords(run.coordinates), [run.coordinates]);
  const score = effortScoreForRun(run);
  const label = sportLabel(run.sport);
  const date = new Date(run.date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const cardBg = isDark ? "#111" : "#f7f7f7";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const fg = isDark ? "#fff" : "#1a1a1a";
  const muted = isDark ? "#8b8b8b" : "#666";

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(idx, 10) * 50).duration(250)}>
      <Animated.View style={scaleStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => { scale.value = withSpring(0.985, { damping: 20, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
        accessibilityRole="button"
        accessibilityLabel={`Open ${label} from ${date}`}
        style={{
          backgroundColor: cardBg,
          borderColor: border,
          borderRadius: 18,
          borderWidth: 1,
          overflow: "hidden",
        }}
      >
        <RoutePreview coords={coords} isDark={isDark} accent={p.accent} />

        <View style={{ gap: 14, padding: 16 }}>
          {/* Header: icon + You + date + share */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${p.accent}1F`,
              }}
            >
              <Route size={21} color={p.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: fg }}>You</Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: muted, marginTop: 1 }}>
                {date}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Share ${label}`}
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onShare();
              }}
            >
              <Share2 size={22} color={muted} />
            </Pressable>
          </View>

          {/* Title + pills */}
          <View style={{ gap: 8 }}>
            <Text
              style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: fg, letterSpacing: 0 }}
              numberOfLines={2}
            >
              {formatKm(run.distance_meters)} km {label}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              <View
                style={{
                  backgroundColor: `${p.accent}1F`,
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent }}>
                  {effortLabel(score)} {score}/100
                </Text>
              </View>
              {run.sport ? (
                <View
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    borderRadius: 999,
                    paddingHorizontal: 9,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: muted }}>
                    {run.sport.replace(/_/g, " ")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Stats: 3 columns */}
          <View style={{ flexDirection: "row", gap: 14 }}>
            {[
              { label: "Distance", value: `${formatKm(run.distance_meters)} km` },
              { label: "Pace", value: formatRunPace(run) },
              { label: "Time", value: formatDurationClock(run.duration_seconds) },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: muted }}>
                  {stat.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 16,
                    color: fg,
                    marginTop: 2,
                  }}
                >
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Bottom row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: border,
              paddingTop: 14,
            }}
          >
            <Flame size={16} color={p.accent} />
            <Text style={{ flex: 1, fontFamily: "Outfit-Regular", fontSize: 12, lineHeight: 17, color: muted }}>
              {run.calories ? `${Math.round(run.calories)} kcal burned` : "Route saved"} · tap to view map
            </Text>
            <ChevronRight size={18} color={muted} />
          </View>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ── BarChart ─────────────────────────────────────────────────────────────────

function BarChart({
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
  const padX = 4;
  const padY = 8;
  const gap = 4;
  const n = points.length;
  const barW = Math.max(4, (width - padX * 2 - gap * (n - 1)) / n);
  const chartH = height - padY * 2;
  const max = Math.max(1, ...points);
  const currentWeekIdx = n - 1;

  return (
    <Svg width={width} height={height}>
      <Path
        d={`M ${padX} ${height - padY} L ${width - padX} ${height - padY}`}
        stroke={gridColor}
        strokeWidth={1}
      />
      {points.map((v, i) => {
        const barH = Math.max(3, (v / max) * chartH);
        const x = padX + i * (barW + gap);
        const y = padY + chartH - barH;
        const isCurrent = i === currentWeekIdx;
        return (
          <Path
            key={i}
            d={`M ${x + 3} ${y + 3} Q ${x} ${y} ${x} ${y + 3} L ${x} ${height - padY} L ${x + barW} ${height - padY} L ${x + barW} ${y + 3} Q ${x + barW} ${y} ${x + barW - 3} ${y + 3} Z`}
            fill={color}
            opacity={isCurrent ? 1 : v === 0 ? 0.12 : 0.35}
          />
        );
      })}
    </Svg>
  );
}

// ── PersonalBestPill ─────────────────────────────────────────────────────────

function PersonalBestPill({
  label,
  value,
  p,
}: {
  label: string;
  value: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: p.cardWhite, borderRadius: 16, padding: 12, gap: 4, alignItems: "center" }}>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary, letterSpacing: -0.3 }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textMuted, letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </Text>
    </View>
  );
}

// ── BackgroundLocationInfoCard ────────────────────────────────────────────────

function BackgroundLocationInfoCard({ p }: { p: ReturnType<typeof useAdminPastel> }) {
  const { isDark } = useAppTheme();
  const [allowed, setAllowed] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getBackgroundLocationAllowed()
      .then((v) => { setAllowed(v); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const toggle = useCallback((next: boolean) => {
    setAllowed(next);
    setBackgroundLocationAllowed(next).catch(() => {});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (!loaded) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400).duration(280)}
      style={{ paddingHorizontal: spacing.xl, paddingTop: 12 }}
    >
      <View
        style={{
          backgroundColor: p.cardWhite,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Info size={17} color={p.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>
              Background location
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, lineHeight: 17 }}>
              Keeps GPS recording when your screen locks or you switch apps, so your full route is captured accurately.
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: p.divider, marginHorizontal: 14 }} />

        {/* Toggle row */}
        <Pressable
          onPress={() => toggle(!allowed)}
          accessibilityRole="switch"
          accessibilityState={{ checked: allowed }}
          accessibilityLabel="Allow background location"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: pressed
              ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
              : "transparent",
          })}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: allowed ? p.textPrimary : p.textMuted }}>
            {allowed ? "Enabled" : "Disabled - locked phone will not track"}
          </Text>
          <Switch
            value={allowed}
            onValueChange={toggle}
            trackColor={{
              false: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)",
              true: p.accent,
            }}
            thumbColor={allowed
              ? isDark ? "hsl(220,5%,92%)" : "hsl(220,5%,98%)"
              : isDark ? "hsl(220,5%,75%)" : "hsl(220,5%,96%)"}
            ios_backgroundColor={isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)"}
          />
        </Pressable>

        {/* Privacy note */}
        <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, lineHeight: 16 }}>
            Location data is stored only on your device. It is never shared with anyone unless you explicitly turn on location sharing during a run.
          </Text>
        </View>
      </View>
    </Animated.View>
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
      <Animated.View entering={FadeInDown.duration(350)}>
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

      <Animated.View entering={FadeInDown.delay(80).duration(350)} style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary, textAlign: "center" }}>
          Ready to run?
        </Text>
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary, textAlign: "center", lineHeight: 20, maxWidth: 220 }}>
          Hit start and we will track every step of the way
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(350)} style={{ width: "100%", paddingTop: 8 }}>
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
              Start running
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

type ManagerListItem =
  | { type: "overview" }
  | { type: "quick-actions" }
  | { type: "live-header" }
  | { type: "live-location"; location: UserLocation; index: number; total: number }
  | { type: "filters" }
  | { type: "athlete-header" }
  | { type: "athlete-empty" }
  | { type: "athlete"; athlete: AthleteWithStats; rank: number; isFirst: boolean; isLast: boolean }
  | { type: "manage-header" }
  | { type: "manage-links" }
  | { type: "spacer" };

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
  const [innerTab, setInnerTab] = useState<"running" | "team">("running");
  const [filter, setFilter] = useState<ManagerFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [liveLocations, setLiveLocations] = useState<UserLocation[]>([]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setFetchError(false);
    try {
      const [lb, locs] = await Promise.all([
        fetchLeaderboard(token, { windowDays: 7, limit: 100, useTeamFeed: true }),
        fetchTeamLocations(token).catch(() => ({ locations: [] as UserLocation[] })),
      ]);
      setLeaderboard(lb?.items ?? []);
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

    return managedAthletes.map((a) => {
      const lb = a.userId ? lbMap.get(a.userId) : undefined;
      return {
        ...a,
        kmTotal: lb?.kmTotal ?? 0,
        durationMinutesTotal: lb?.durationMinutesTotal ?? 0,
        rank: lb?.rank ?? null,
        lastRunDate: null,
      };
    });
  }, [managedAthletes, leaderboard]);

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

  const managerListData = useMemo<ManagerListItem[]>(() => {
    const items: ManagerListItem[] = [
      { type: "overview" },
      { type: "quick-actions" },
    ];

    if (liveLocations.length > 0) {
      items.push({ type: "live-header" });
      liveLocations.forEach((location, index) => {
        items.push({ type: "live-location", location, index, total: liveLocations.length });
      });
    }

    items.push({ type: "filters" }, { type: "athlete-header" });

    if (filtered.length === 0) {
      items.push({ type: "athlete-empty" });
    } else {
      filtered.forEach((athlete, index) => {
        items.push({
          type: "athlete",
          athlete,
          rank: index + 1,
          isFirst: index === 0,
          isLast: index === filtered.length - 1,
        });
      });
    }

    items.push({ type: "spacer" });
    return items;
  }, [filtered, liveLocations]);

  const managerKeyExtractor = useCallback((item: ManagerListItem) => {
    switch (item.type) {
      case "live-location":
        return `live-${item.location.userId}`;
      case "athlete":
        return `athlete-${item.athlete.id ?? item.athlete.userId ?? item.rank}`;
      default:
        return item.type;
    }
  }, []);

  const openSocial = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInnerTab("team");
  }, []);

  const renderManagerItem = useCallback(({ item }: { item: ManagerListItem }) => {
    switch (item.type) {
      case "overview":
        return (
          <View style={{ gap: 8 }}>
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
          </View>
        );
      case "quick-actions":
        return (
          <View style={{ gap: 8 }}>
            <SectionLabel p={p} label="Quick Actions" />
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
          </View>
        );
      case "live-header":
        return <SectionLabel p={p} label={`Live Now · ${liveLocations.length} ${liveLocations.length === 1 ? "athlete" : "athletes"}`} />;
      case "live-location":
        return <LiveLocationRow location={item.location} index={item.index} total={item.total} p={p} />;
      case "filters":
        return (
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
        );
      case "athlete-header":
        return <SectionLabel p={p} label="Athletes · This Week" />;
      case "athlete-empty":
        return (
          <View style={{ paddingVertical: 40, alignItems: "center", gap: 8 }}>
            {filter === "inactive" ? <Moon size={32} color={p.textMuted} /> : <Zap size={32} color={p.textMuted} />}
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
              {filter === "inactive" ? "All athletes are active this week" : "No athletes match this filter"}
            </Text>
          </View>
        );
      case "athlete":
        return (
          <AthleteRow
            athlete={item.athlete}
            rank={item.rank}
            p={p}
            isFirst={item.isFirst}
            isLast={item.isLast}
            onPress={openSocial}
          />
        );
      case "manage-header":
        return <SectionLabel p={p} label="Manage" />;
      case "manage-links":
        return (
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
              onPress={openSocial}
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
        );
      case "spacer":
        return <View style={{ height: 100 }} />;
    }
  }, [
    activeCount,
    athletes.length,
    capabilities?.schedule,
    filter,
    inactiveCount,
    liveLocations.length,
    managedAthletes.length,
    openSocial,
    p,
    router,
    teamTotalKm,
    teamTotalMin,
  ]);

  if (innerTab === "team") {
    return <TrackingSocialScreen onGoBack={() => setInnerTab("running")} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <FlashList
        data={loading || fetchError ? [] : managerListData}
        renderItem={renderManagerItem}
        keyExtractor={managerKeyExtractor}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={120}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: trackingScrollBottomPad(insets),
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={p.accent}
            colors={[p.accent]}
          />
        }
        ListHeaderComponent={
          <View style={{ marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl }}>
            <TrackingHeaderTabs
              active={innerTab}
              colors={{ accent: p.accent, background: p.pageBg, card: p.cardWhite, textSecondary: p.textSecondary } as any}
              isDark={isDark}
              topInset={insets.top}
              paddingHorizontal={0}
              showTeamTab={showTeamTab}
              onTabChange={(t) => setInnerTab(t)}
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: loading || fetchError ? 0 : spacing.md }}>
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
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonTrackingSocialScreen />
          ) : fetchError ? (
            <View style={{ paddingVertical: 60, alignItems: "center", gap: 12 }}>
              <CloudOff size={36} color={p.textMuted} />
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, textAlign: "center" }}>
                Could not load team data. Pull down to retry.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ── ManagerStatCard ────────────────────────────────────────────────────────

function SectionLabel({ label, p }: { label: string; p: ReturnType<typeof useAdminPastel> }) {
  return (
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
      {label}
    </Text>
  );
}

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

const LiveLocationRow = React.memo(function LiveLocationRow({
  location,
  index,
  total,
  p,
}: {
  location: UserLocation;
  index: number;
  total: number;
  p: ReturnType<typeof useAdminPastel>;
}) {
  const minutesAgo = Math.floor(
    (Date.now() - new Date(location.recordedAt).getTime()) / 60000,
  );
  const isRecent = minutesAgo < 10;

  return (
    <View
      style={{
        backgroundColor: p.cardWhite,
        borderTopLeftRadius: index === 0 ? 22 : 0,
        borderTopRightRadius: index === 0 ? 22 : 0,
        borderBottomLeftRadius: index === total - 1 ? 22 : 0,
        borderBottomRightRadius: index === total - 1 ? 22 : 0,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: index < total - 1 ? 1 : 0,
          borderBottomColor: p.divider,
        }}
      >
        <View>
          <ManagerAvatar
            uri={null}
            name={location.name}
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
            {location.name}
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
    </View>
  );
});

// ── AthleteRow ─────────────────────────────────────────────────────────────

const AthleteRow = React.memo(function AthleteRow({
  athlete,
  rank,
  p,
  isFirst,
  isLast,
  onPress,
}: {
  athlete: AthleteWithStats;
  rank: number;
  p: ReturnType<typeof useAdminPastel>;
  isFirst: boolean;
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
        backgroundColor: pressed ? p.accentSoft : p.cardWhite,
        borderTopLeftRadius: isFirst ? 22 : 0,
        borderTopRightRadius: isFirst ? 22 : 0,
        borderBottomLeftRadius: isLast ? 22 : 0,
        borderBottomRightRadius: isLast ? 22 : 0,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: p.divider,
        overflow: "hidden",
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
});

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
        cachePolicy="disk"
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

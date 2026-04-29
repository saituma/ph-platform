import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { fonts, spacing } from "@/constants/theme";
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

const SPORT_CATEGORIES: { label: string; icon: string; sports: string[] }[] = [
  { label: "Foot Sports", icon: "shoe-sneaker", sports: ["run", "trail_run", "walk", "hike", "virtual_run", "treadmill"] },
  { label: "Cycle Sports", icon: "bike", sports: ["ride"] },
  { label: "Water Sports", icon: "swim", sports: ["swim"] },
];

export default function TrackingHomeScreen() {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const appRole = useAppSelector((s) => s.user.appRole);
  const programTier = useAppSelector((s) => s.user.programTier);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);
  const userId = useAppSelector((s) => s.user.profile.id ?? null);
  const token = useAppSelector((s) => s.user.token);

  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState(() => getWeeklySummaries(new Date(), userId));

  const fabScale = useSharedValue(1);
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1.0, { damping: 20, stiffness: 400 });
  };

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

  const canAccessTracking = canAccessTrackingTab({
    appRole,
    programTier,
    authTeamMembership,
    firstManagedAthlete: managedAthletes[0] ?? null,
  });
  const isTeamManager = appRole === "team_manager";
  const showTeamTab = shouldUseTeamTrackingFeatures({
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
  const [sportSheetOpen, setSportSheetOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportId>("run");

  // When a run is already active and the user lands on / returns to this screen,
  // jump straight to the live stats screen. Crucially, this is `useFocusEffect`
  // (not `useEffect`) — otherwise this fires on every store status change while
  // the user is on /active-run, re-mounting that screen and wiping its local state
  // (mapStyle, sheet positions, etc.).
  useFocusEffect(
    useCallback(() => {
      if (runStatus === "running" || runStatus === "paused") {
        router.replace("/(tabs)/tracking/active-run" as any);
      }
    }, [runStatus, router]),
  );

  const handleStartRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (runStatus === "running" || runStatus === "paused") {
      router.replace("/(tabs)/tracking/active-run" as any);
      return;
    }
    setSportSheetOpen(true);
  }, [router, runStatus]);

  useEffect(() => {
    if (canAccessTracking) return;
    router.replace("/(tabs)");
  }, [canAccessTracking, router]);

  if (!canAccessTracking) return null;

  if (isTeamManager) {
    return (
      <ManagerDashboard
        colors={colors}
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

  // Robis: tinted not pure, low-sat dark bg
  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)";
  const metricBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
  const separatorColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: trackingScrollBottomPad(insets) }}
      >
        <View style={{ paddingHorizontal: spacing.xl }}>
          <TrackingHeaderTabs
            active="running"
            colors={colors}
            isDark={isDark}
            topInset={insets.top}
            paddingHorizontal={0}
            showTeamTab={showTeamTab}
          />

          <ActiveRunBanner />
        </View>

        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: 12 }}>

          {/* ── This Week hero card ── */}
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: cardBorder,
              padding: 20,
              gap: 16,
            }}
          >
            {/* Label row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  color: isDark ? "hsl(220,5%,50%)" : "hsl(220,5%,48%)",
                  textTransform: "uppercase",
                }}
              >
                This Week
              </Text>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 12,
                  color: isDark ? "hsl(220,5%,48%)" : "hsl(220,5%,52%)",
                }}
              >
                {weeklyRunCountLabel}
              </Text>
            </View>

            {/* Big number */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
              <Text
                style={{
                  fontFamily: fonts.heroDisplay,
                  fontSize: 52,
                  lineHeight: 52,
                  // Robis: tinted not pure white
                  color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)",
                  letterSpacing: -1,
                }}
              >
                {formatKm(weeklyStats.totalDistance)}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 20,
                  color: colors.textSecondary,
                  paddingBottom: 8,
                }}
              >
                km
              </Text>
            </View>

            {/* Metrics row — outer padding 20, inner radius = 24-20 = 4 → use 8 for feel */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MetricTile
                label="Time"
                value={`${weeklyTime.h}h ${weeklyTime.m}m`}
                bg={metricBg}
                accent={colors.accent}
              />
              <MetricTile
                label="Avg / run"
                value={`${averageRunDistanceKm} km`}
                bg={metricBg}
                accent={colors.accent}
              />
              <MetricTile
                label="Status"
                value={weeklyStats.numRuns > 0 ? "Active" : "Ready"}
                bg={metricBg}
                accent={colors.accent}
                valueIsAccent
              />
            </View>
          </View>

          {/* ── Weekly distance chart ── */}
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: cardBorder,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)" }}>
                  Weekly distance
                </Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: isDark ? "hsl(220,5%,48%)" : "hsl(220,5%,50%)" }}>
                  Last 12 weeks
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: isDark ? "hsl(220,5%,42%)" : "hsl(220,5%,55%)" }}>
                {lastRunLabel}
              </Text>
            </View>
            <LineChart
              width={Math.max(260, screenWidth - spacing.xl * 2 - 40)}
              height={96}
              points={last12WeeksKm}
              color={colors.accent}
              gridColor={isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)"}
            />
          </View>

          {/* ── Progress shortcut ── */}
          <Pressable
            onPress={() => router.push("/progress" as any)}
            style={({ pressed }) => ({
              backgroundColor: cardBg,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: cardBorder,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {/* outer padding 16, icon wrap radius = 24-16 = 8 */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: isDark ? "rgba(255,255,255,0.07)" : `${colors.accent}18`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="trending-up-outline" size={19} color={colors.accent} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)" }}>
                  Progress Tracking
                </Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: isDark ? "hsl(220,5%,48%)" : "hsl(220,5%,50%)" }}>
                  Strength · Weight · Body
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={isDark ? "hsl(220,5%,40%)" : "hsl(220,5%,58%)"}
            />
          </Pressable>

          {/* ── Recent runs (categorized) ── */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)" }}>
                Activities
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: isDark ? "hsl(220,5%,42%)" : "hsl(220,5%,55%)" }}>
                {runs.length} total
              </Text>
            </View>

            {runs.length === 0 ? (
              <TrackingEmptyState onStartRun={handleStartRun} colors={colors} isDark={isDark} />
            ) : hasCategorized ? (
              /* ── Multi-sport: show by category ── */
              <View style={{ gap: 12 }}>
                {categorizedRuns.map((section) => (
                  <View key={section.label} style={{ gap: 6 }}>
                    {/* Section header */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
                      <MaterialCommunityIcons name={section.icon as any} size={14} color={colors.accent} />
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,48%)", textTransform: "uppercase" }}>
                        {section.label}
                      </Text>
                    </View>
                    {/* Runs card */}
                    <View style={{ backgroundColor: cardBg, borderRadius: 20, borderWidth: 1, borderColor: cardBorder, overflow: "hidden" }}>
                      {section.data.slice(0, 5).map((run, idx) => (
                        <RunRow
                          key={run.id}
                          run={run}
                          idx={idx}
                          total={Math.min(section.data.length, 5)}
                          colors={colors}
                          isDark={isDark}
                          separatorColor={separatorColor}
                          formatKm={formatKm}
                          onPress={() => router.push(`/(tabs)/tracking/run-path/${encodeURIComponent(run.id)}` as any)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              /* ── Single sport: plain list ── */
              <View style={{ backgroundColor: cardBg, borderRadius: 24, borderWidth: 1, borderColor: cardBorder, overflow: "hidden" }}>
                {runs.slice(0, 6).map((run, idx) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    idx={idx}
                    total={Math.min(runs.length, 6)}
                    colors={colors}
                    isDark={isDark}
                    separatorColor={separatorColor}
                    formatKm={formatKm}
                    onPress={() => router.push(`/(tabs)/tracking/run-path/${encodeURIComponent(run.id)}` as any)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — robis: border instead of shadow in dark mode */}
      <View
        style={{
          position: "absolute",
          bottom: trackingScrollBottomPad(insets) + 20,
          right: 20,
          zIndex: 99,
          opacity: sportSheetOpen ? 0 : 1,
          // Light mode only shadow
          ...(isDark
            ? {}
            : {
                shadowColor: colors.accent,
                shadowOpacity: 0.25,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }),
        }}
      >
        <Animated.View style={fabAnimatedStyle}>
          <Pressable
            onPress={handleStartRun}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              // Robis: dark mode uses border for elevation, not shadow
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "transparent",
            }}
            accessibilityRole="button"
            accessibilityLabel="Start run"
          >
            <Ionicons name="play" size={28} color={isDark ? "hsl(220,8%,10%)" : "#fafafa"} style={{ marginLeft: 4 }} />
          </Pressable>
        </Animated.View>
      </View>
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
        router.push("/(tabs)/tracking/active-run" as any);
      }}
      onClose={() => setSportSheetOpen(false)}
      colors={colors}
    />
    </>
  );
}

// ── RunRow ───────────────────────────────────────────────────────────────────

function RunRow({
  run,
  idx,
  total,
  colors,
  isDark,
  separatorColor,
  formatKm,
  onPress,
}: {
  run: RunRecord;
  idx: number;
  total: number;
  colors: Record<string, string>;
  isDark: boolean;
  separatorColor: string;
  formatKm: (m: number) => string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: pressed
          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
          : "transparent",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: colors.accent, opacity: 0.55 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)" }}>
                {formatKm(run.distance_meters)}
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                km
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: isDark ? "hsl(220,5%,44%)" : "hsl(220,5%,54%)", marginTop: 1 }}>
              {new Date(run.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: isDark ? "hsl(220,5%,56%)" : "hsl(220,5%,44%)" }}>
          {formatDurationClock(run.duration_seconds)}
        </Text>
      </View>

      {idx < total - 1 && (
        <View style={{ position: "absolute", bottom: 0, left: 35, right: 20, height: 1, backgroundColor: separatorColor }} />
      )}
    </Pressable>
  );
}

// ── MetricTile ──────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  bg,
  accent,
  valueIsAccent = false,
}: {
  label: string;
  value: string;
  bg: string;
  accent: string;
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
          fontFamily: fonts.bodyBold,
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
          fontFamily: fonts.bodyBold,
          fontSize: 14,
          color: valueIsAccent ? accent : undefined,
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
  colors,
  isDark,
}: {
  onStartRun: () => void;
  colors: any;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
          <Circle cx="50" cy="20" r="10" fill={colors.accent} opacity="0.85" />
          <Path d="M50 35 C58 50, 42 65, 48 85" stroke={colors.accent} strokeWidth="8" strokeLinecap="round" opacity="0.75" />
          <Path d="M50 35 C38 45, 62 60, 58 85" stroke={colors.accent} strokeWidth="8" strokeLinecap="round" opacity="0.4" />
          <Path d="M50 35 L26 46" stroke={colors.accent} strokeWidth="8" strokeLinecap="round" opacity="0.65" />
          <Path d="M50 35 L74 26" stroke={colors.accent} strokeWidth="8" strokeLinecap="round" opacity="0.65" />
          <Path d="M15 95 L85 95" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" opacity="0.25" />
          <Path d="M5 50 L18 50 M10 70 L23 70" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
        </Svg>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(500).springify()} style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: fonts.heading2, fontSize: 22, color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,10%)", textAlign: "center" }}>
          Your first run awaits
        </Text>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 14, color: isDark ? "hsl(220,5%,48%)" : "hsl(220,5%,48%)", textAlign: "center", lineHeight: 20, maxWidth: 220 }}>
          Hit start and we'll track every step of the way
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(500).springify()} style={{ width: "100%", paddingTop: 8 }}>
        <Animated.View style={btnStyle}>
          <Pressable
            onPress={onStartRun}
            onPressIn={() => {
              scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
            style={{
              backgroundColor: colors.accent,
              height: 52,
              borderRadius: 26,
              justifyContent: "center",
              alignItems: "center",
              // Robis: dark mode border not shadow
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? "rgba(255,255,255,0.10)" : "transparent",
            }}
          >
            <Text style={{ fontFamily: fonts.heading2, fontSize: 15, color: isDark ? "hsl(220,8%,10%)" : "hsl(0,0%,98%)" }}>
              Start your first run
            </Text>
          </Pressable>
        </Animated.View>
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
  colors,
  isDark,
  insets,
  showTeamTab,
  token,
  managedAthletes,
  authTeamMembership,
  router,
}: {
  colors: Record<string, string>;
  isDark: boolean;
  insets: { top: number; bottom: number };
  showTeamTab: boolean;
  token: string | null;
  managedAthletes: ManagedAthlete[];
  authTeamMembership: { team: string | null; teamId: number | null } | null;
  router: ReturnType<typeof useRouter>;
}) {
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const [filter, setFilter] = useState<ManagerFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [leaderboard, setLeaderboard] = useState<SocialLeaderboardItem[]>([]);
  const [recentRuns, setRecentRuns] = useState<SocialRunFeedItem[]>([]);
  const [liveLocations, setLiveLocations] = useState<UserLocation[]>([]);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const activeGreen = isDark ? "hsl(155, 30%, 55%)" : "hsl(155, 40%, 40%)";
  const inactiveGray = isDark ? "hsl(220, 5%, 50%)" : "hsl(220, 5%, 55%)";

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: trackingScrollBottomPad(insets) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={{ paddingHorizontal: spacing.xl }}>
          <TrackingHeaderTabs
            active="running"
            colors={colors}
            isDark={isDark}
            topInset={insets.top}
            paddingHorizontal={0}
            showTeamTab={showTeamTab}
          />

          {/* Team name */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 13,
                color: labelColor,
              }}
            >
              {teamName} · Manager View
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: "center" }}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : fetchError ? (
          <View style={{ paddingVertical: 60, alignItems: "center", gap: 12, paddingHorizontal: spacing.xl }}>
            <Ionicons name="cloud-offline-outline" size={36} color={labelColor} />
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: labelColor, textAlign: "center" }}>
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
                icon="speedometer-outline"
                accent={colors.accent}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
              <ManagerStatCard
                label="Team Time"
                value={`${Math.floor(teamTotalMin / 60)}h ${Math.round(teamTotalMin % 60)}m`}
                icon="time-outline"
                accent={colors.accent}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ManagerStatCard
                label="Active"
                value={String(activeCount)}
                icon="flash-outline"
                accent={activeGreen}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
              <ManagerStatCard
                label="Inactive"
                value={String(inactiveCount)}
                icon="moon-outline"
                accent={inactiveGray}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
              <ManagerStatCard
                label="Athletes"
                value={String(managedAthletes.length)}
                icon="people-outline"
                accent={colors.accent}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
            </View>

            {/* ── Quick Actions ── */}
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 11,
                letterSpacing: 1.2,
                color: labelColor,
                textTransform: "uppercase",
                paddingLeft: 4,
                marginTop: 4,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ManagerQuickAction
                icon="calendar-outline"
                label="Schedule"
                isDark={isDark}
                accent={colors.accent}
                cardBg={cardBg}
                cardBorder={cardBorder}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/schedule" as any);
                }}
              />
              <ManagerQuickAction
                icon="megaphone-outline"
                label="Announce"
                isDark={isDark}
                accent={isDark ? "hsl(40, 30%, 55%)" : "hsl(40, 45%, 45%)"}
                cardBg={cardBg}
                cardBorder={cardBorder}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/announcements" as any);
                }}
              />
              <ManagerQuickAction
                icon="clipboard-outline"
                label="Roster"
                isDark={isDark}
                accent={isDark ? "hsl(270, 25%, 65%)" : "hsl(270, 35%, 50%)"}
                cardBg={cardBg}
                cardBorder={cardBorder}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/team-manager/roster" as any);
                }}
              />
              <ManagerQuickAction
                icon="chatbubbles-outline"
                label="Chat"
                isDark={isDark}
                accent={isDark ? "hsl(190, 25%, 55%)" : "hsl(190, 40%, 40%)"}
                cardBg={cardBg}
                cardBorder={cardBorder}
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
                    fontFamily: fonts.bodyBold,
                    fontSize: 11,
                    letterSpacing: 1.2,
                    color: labelColor,
                    textTransform: "uppercase",
                    paddingLeft: 4,
                    marginTop: 4,
                  }}
                >
                  Live Now · {liveLocations.length} {liveLocations.length === 1 ? "athlete" : "athletes"}
                </Text>
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: cardBorder,
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
                          borderBottomColor: cardBorder,
                        }}
                      >
                        <View>
                          <ManagerAvatar
                            uri={null}
                            name={loc.name}
                            size={36}
                            isDark={isDark}
                            accent={colors.accent}
                          />
                          <View
                            style={{
                              position: "absolute",
                              bottom: -1,
                              right: -1,
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: isRecent ? activeGreen : (isDark ? "hsl(40, 30%, 55%)" : "hsl(40, 45%, 45%)"),
                              borderWidth: 2,
                              borderColor: cardBg,
                            }}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: fonts.bodyBold,
                              fontSize: 14,
                              color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)",
                            }}
                          >
                            {loc.name}
                          </Text>
                          <Text
                            style={{
                              fontFamily: fonts.bodyMedium,
                              fontSize: 12,
                              color: isRecent ? activeGreen : labelColor,
                            }}
                          >
                            {isRecent ? "Sharing now" : `${minutesAgo}m ago`}
                          </Text>
                        </View>
                        <Ionicons
                          name="location"
                          size={16}
                          color={isRecent ? activeGreen : labelColor}
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
                      borderRadius: 20,
                      backgroundColor: selected
                        ? colors.accent
                        : isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
                      borderWidth: 1,
                      borderColor: selected
                        ? colors.accent
                        : cardBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodyBold,
                        fontSize: 12,
                        color: selected
                          ? isDark ? "hsl(220,8%,10%)" : "#fafafa"
                          : isDark ? "hsl(220,5%,65%)" : "hsl(220,5%,40%)",
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
                fontFamily: fonts.bodyBold,
                fontSize: 11,
                letterSpacing: 1.2,
                color: labelColor,
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
                <Ionicons
                  name={filter === "inactive" ? "moon-outline" : "flash-outline"}
                  size={32}
                  color={labelColor}
                />
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: labelColor }}>
                  {filter === "inactive" ? "All athletes are active this week" : "No athletes match this filter"}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  overflow: "hidden",
                }}
              >
                {filtered.map((athlete, idx) => (
                  <AthleteRow
                    key={athlete.id ?? athlete.userId ?? idx}
                    athlete={athlete}
                    rank={idx + 1}
                    colors={colors}
                    isDark={isDark}
                    cardBorder={cardBorder}
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
                    fontFamily: fonts.bodyBold,
                    fontSize: 11,
                    letterSpacing: 1.2,
                    color: labelColor,
                    textTransform: "uppercase",
                    paddingLeft: 4,
                    marginTop: 8,
                  }}
                >
                  Recent Activity
                </Text>
                <View
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: cardBorder,
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
                        backgroundColor: pressed
                          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
                          : "transparent",
                      })}
                    >
                      <ManagerAvatar
                        uri={run.avatarUrl}
                        name={run.name}
                        size={36}
                        isDark={isDark}
                        accent={colors.accent}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: fonts.bodyBold,
                              fontSize: 14,
                              color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)",
                              flex: 1,
                            }}
                          >
                            {run.name}
                          </Text>
                          <Text
                            style={{
                              fontFamily: fonts.bodyMedium,
                              fontSize: 11,
                              color: labelColor,
                            }}
                          >
                            {relativeTime(run.date)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent }}>
                            {(run.distanceMeters / 1000).toFixed(1)} km
                          </Text>
                          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: labelColor }}>
                            {formatDurationClock(run.durationSeconds)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={labelColor} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* ── Management links ── */}
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 11,
                letterSpacing: 1.2,
                color: labelColor,
                textTransform: "uppercase",
                paddingLeft: 4,
                marginTop: 8,
              }}
            >
              Manage
            </Text>
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: cardBorder,
                overflow: "hidden",
              }}
            >
              <ManagerLinkRow
                icon="trophy-outline"
                label="Team Feed & Leaderboard"
                subtitle="Posts, challenges, and squad activity"
                accent={colors.accent}
                isDark={isDark}
                cardBorder={cardBorder}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/tracking/social" as any);
                }}
              />
              <ManagerLinkRow
                icon="settings-outline"
                label="Team Tracking Settings"
                subtitle="Privacy, sharing, and visibility"
                accent={isDark ? "hsl(220,5%,65%)" : "hsl(220,5%,45%)"}
                isDark={isDark}
                cardBorder={cardBorder}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/tracking/team-settings" as any);
                }}
              />
              {capabilities?.schedule && (
                <ManagerLinkRow
                  icon="calendar-outline"
                  label="Team Schedule"
                  subtitle="Training sessions and events"
                  accent={isDark ? "hsl(270, 25%, 65%)" : "hsl(270, 35%, 50%)"}
                  isDark={isDark}
                  cardBorder={cardBorder}
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

function ManagerStatCard({
  label,
  value,
  icon,
  accent,
  isDark,
  cardBg,
  cardBorder,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: 14,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text
        style={{
          fontFamily: fonts.heroDisplay,
          fontSize: 22,
          color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)",
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: 10,
          letterSpacing: 0.8,
          color: isDark ? "hsl(220,5%,50%)" : "hsl(220,5%,48%)",
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
  colors,
  isDark,
  cardBorder,
  isLast,
  onPress,
}: {
  athlete: AthleteWithStats;
  rank: number;
  colors: Record<string, string>;
  isDark: boolean;
  cardBorder: string;
  isLast: boolean;
  onPress: () => void;
}) {
  const labelColor = isDark ? "hsl(220,5%,52%)" : "hsl(220,5%,48%)";
  const isActive = athlete.kmTotal > 0;

  const statusDot = isActive
    ? isDark ? "hsl(155, 30%, 55%)" : "hsl(155, 40%, 40%)"
    : isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,65%)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: pressed
          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
          : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: cardBorder,
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
              ? rank === 1 ? "rgba(255,195,0,0.18)" : rank === 2 ? "rgba(192,192,192,0.22)" : "rgba(205,127,50,0.18)"
              : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 12,
              color: rank <= 3 && isActive
                ? rank === 1 ? "#D4A017" : rank === 2 ? "#8E8E93" : "#B87333"
                : labelColor,
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
          isDark={isDark}
          accent={colors.accent}
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
            borderColor: isDark ? "hsl(220, 8%, 12%)" : colors.card,
          }}
        />
      </View>

      {/* Name + last activity */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.bodyBold,
            fontSize: 15,
            color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)",
          }}
        >
          {athlete.name ?? "Unknown"}
        </Text>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 12,
            color: labelColor,
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
            fontFamily: fonts.bodyBold,
            fontSize: 15,
            color: isActive ? colors.accent : labelColor,
          }}
        >
          {athlete.kmTotal.toFixed(1)} km
        </Text>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: labelColor,
          }}
        >
          {Math.floor(athlete.durationMinutesTotal / 60)}h {Math.round(athlete.durationMinutesTotal % 60)}m
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={labelColor} />
    </Pressable>
  );
}

// ── ManagerAvatar ──────────────────────────────────────────────────────────

function ManagerAvatar({
  uri,
  name,
  size,
  isDark,
  accent,
}: {
  uri: string | null;
  name: string;
  size: number;
  isDark: boolean;
  accent: string;
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
        backgroundColor: isDark ? "rgba(200,241,53,0.12)" : `${accent}18`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyBold,
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

function ManagerQuickAction({
  icon,
  label,
  isDark,
  accent,
  cardBg,
  cardBorder,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isDark: boolean;
  accent: string;
  cardBg: string;
  cardBorder: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: cardBorder,
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
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: 11,
          color: isDark ? "hsl(220,5%,70%)" : "hsl(220,5%,35%)",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── ManagerLinkRow ─────────────────────────────────────────────────────────

function ManagerLinkRow({
  icon,
  label,
  subtitle,
  accent,
  isDark,
  cardBorder,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  accent: string;
  isDark: boolean;
  cardBorder: string;
  isLast?: boolean;
  onPress: () => void;
}) {
  const linkLabelColor = isDark ? "hsl(220,5%,52%)" : "hsl(220,5%,48%)";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: pressed
          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
          : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: cardBorder,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: fonts.bodyBold,
            fontSize: 14,
            color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 12,
            color: linkLabelColor,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={linkLabelColor} />
    </Pressable>
  );
}

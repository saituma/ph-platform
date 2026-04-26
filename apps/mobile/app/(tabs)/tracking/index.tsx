import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
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
import {
  canAccessTrackingTab,
  shouldUseTeamTrackingFeatures,
} from "@/lib/tracking/teamTrackingGate";

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

  // When a run is already active, jump straight to the live stats screen.
  useEffect(() => {
    if (runStatus === "running" || runStatus === "paused") {
      router.replace("/(tabs)/tracking/active-run" as any);
    }
  }, [runStatus, router]);

  const handleStartRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (runStatus === "running" || runStatus === "paused") {
      router.replace("/(tabs)/tracking/active-run" as any);
      return;
    }
    const store = useRunStore.getState();
    store.resetRun();
    store.setDestination(null);
    store.setGoalKm(null);
    store.setProgressNotifyEveryMeters(null);
    store.startRun();
    router.push("/(tabs)/tracking/active-run" as any);
  }, [router, runStatus]);

  useEffect(() => {
    if (canAccessTracking) return;
    router.replace("/(tabs)");
  }, [canAccessTracking, router]);

  if (!canAccessTracking) return null;

  // Robis: tinted not pure, low-sat dark bg
  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)";
  const metricBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
  const separatorColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
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

          {isTeamManager && (
            <View
              style={{
                marginTop: spacing.sm,
                borderRadius: 16,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight,
                borderWidth: 1,
                borderColor: cardBorder,
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 4,
              }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }}>
                Team tracking
              </Text>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                Review athlete routes and team activity from the Team tab.
              </Text>
            </View>
          )}

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

          {/* ── Recent runs ── */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)" }}>
                Recent runs
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: isDark ? "hsl(220,5%,42%)" : "hsl(220,5%,55%)" }}>
                {runs.length} total
              </Text>
            </View>

            {runs.length === 0 ? (
              <TrackingEmptyState onStartRun={handleStartRun} colors={colors} isDark={isDark} />
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
                {runs.slice(0, 6).map((run, idx) => (
                  <Pressable
                    key={run.id}
                    onPress={() =>
                      router.push(`/(tabs)/tracking/run-path/${encodeURIComponent(run.id)}` as any)
                    }
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
                        {/* Accent bar */}
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

                    {idx < Math.min(runs.length, 6) - 1 && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 35,
                          right: 20,
                          height: 1,
                          backgroundColor: separatorColor,
                        }}
                      />
                    )}
                  </Pressable>
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

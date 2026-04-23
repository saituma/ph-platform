import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { fonts, radius, Shadows, spacing } from "@/constants/theme";
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

  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState(() => getWeeklySummaries());

  const reload = useCallback(() => {
    try {
      setRuns(getRecentRuns(80));
      setWeeklyStats(getWeeklySummaries());
    } catch {
      setRuns([]);
      setWeeklyStats({ totalDistance: 0, totalTime: 0, numRuns: 0 });
    }
  }, []);

  useEffect(() => {
    initSQLiteRuns();
    const task = requestAnimationFrame(() => {
      reload();
    });

    return () => cancelAnimationFrame(task);
  }, [reload]);

  const weeklyTime = formatHoursMinutes(weeklyStats.totalTime);
  const formatKm = (meters: number) => (meters / 1000).toFixed(1);

  const last12WeeksKm = useMemo(() => {
    const now = new Date();
    const weekStart = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay(); // 0 = Sun
      const mondayOffset = (day + 6) % 7;
      date.setDate(date.getDate() - mondayOffset);
      date.setHours(0, 0, 0, 0);
      return date;
    };
    const thisWeekStart = weekStart(now);
    const buckets = new Array(12).fill(0);

    runs.forEach((r) => {
      const d = new Date(r.date);
      const ws = weekStart(d);
      const diffWeeks = Math.floor(
        (thisWeekStart.getTime() - ws.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      if (diffWeeks >= 0 && diffWeeks < 12) {
        buckets[11 - diffWeeks] += r.distance_meters / 1000;
      }
    });

    return buckets.map((v) => Number(v.toFixed(1)));
  }, [runs]);

  const cardBorder = "rgba(255,255,255,0.08)";
  const cardBg = colors.surface;
  const canAccessTracking = canAccessTrackingTab({
    appRole,
    programTier,
    authTeamMembership,
    firstManagedAthlete: managedAthletes[0] ?? null,
  });
  const showTeamTab = shouldUseTeamTrackingFeatures({
    appRole,
    authTeamMembership,
    firstManagedAthlete: managedAthletes[0] ?? null,
  });
  const latestRun = runs[0] ?? null;
  const weeklyRunCountLabel = `${weeklyStats.numRuns} ${weeklyStats.numRuns === 1 ? "run" : "runs"} this week`;
  const averageRunDistanceKm =
    weeklyStats.numRuns > 0 ? (weeklyStats.totalDistance / weeklyStats.numRuns / 1000).toFixed(1) : "0.0";
  const runStreakLabel = latestRun
    ? `Last activity ${new Date(latestRun.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`
    : "No runs logged yet";

  const handleStartRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const store = useRunStore.getState();
    store.resetRun();
    store.setDestination(null);
    store.setGoalKm(null);
    store.setProgressNotifyEveryMeters(null);
    router.push("/(tabs)/tracking/active-run" as any);
  }, [router]);

  useEffect(() => {
    if (canAccessTracking) return;
    router.replace("/(tabs)");
  }, [canAccessTracking, router]);

  if (!canAccessTracking) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: trackingScrollBottomPad(insets),
        }}
      >
        <View style={{ paddingHorizontal: spacing.xl }}>
          {showTeamTab ? (
            <TrackingHeaderTabs
              active="running"
              colors={colors}
              isDark={isDark}
              topInset={insets.top}
              paddingHorizontal={0}
              showTeamTab
            />
          ) : (
            <View style={{ paddingTop: insets.top, paddingBottom: spacing.md }} />
          )}

          <View
            style={{
              marginTop: spacing.xs,
              marginBottom: spacing.md,
              width: "100%",
              minHeight: 52,
              alignSelf: "stretch",
              backgroundColor: "#16A34A",
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: "#15803D",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              ...Shadows.sm,
            }}
          >
            <Pressable
              onPress={handleStartRun}
              style={({ pressed }) => ({
                width: "100%",
                minHeight: 52,
                paddingHorizontal: spacing.lg,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Start run"
            >
              <Text
                style={{
                  fontFamily: fonts.heading3,
                  fontSize: 16,
                  color: colors.textPrimary,
                  textAlign: "center",
                }}
              >
                Run
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg }}>
          <View
            style={{
              backgroundColor: "#0D140F",
              borderRadius: radius.xxl,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.18)",
              gap: spacing.lg,
            }}
          >
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontFamily: fonts.labelCaps,
                  fontSize: 11,
                  color: "#6EE7B7",
                  letterSpacing: 0.8,
                }}
              >
                THIS WEEK
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                <Text
                  style={{
                    fontFamily: fonts.heroDisplay,
                    fontSize: 56,
                    color: colors.textPrimary,
                    lineHeight: 58,
                  }}
                >
                  {formatKm(weeklyStats.totalDistance)}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.labelBold,
                    fontSize: 16,
                    color: "#D1FAE5",
                    marginBottom: 10,
                  }}
                >
                  km
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 14,
                  color: "#A7F3D0",
                }}
              >
                {weeklyRunCountLabel}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
              }}
            >
              <SummaryMetric
                label="Time"
                value={`${weeklyTime.h}h ${weeklyTime.m}m`}
                tone="#FFFFFF"
              />
              <SummaryMetric
                label="Avg / run"
                value={`${averageRunDistanceKm} km`}
                tone="#FFFFFF"
              />
              <SummaryMetric
                label="Status"
                value={weeklyStats.numRuns > 0 ? "Active" : "Ready"}
                tone="#86EFAC"
              />
            </View>
          </View>

          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: radius.xxl,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: cardBorder,
              gap: spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: fonts.heading3,
                    fontSize: 18,
                    color: colors.textPrimary,
                  }}
                >
                  Weekly distance
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Your last 12 weeks
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: fonts.labelBold,
                  fontSize: 12,
                  color: colors.textDim,
                }}
              >
                {runStreakLabel}
              </Text>
            </View>
            <LineChart
              width={Math.max(260, screenWidth - spacing.xl * 4)}
              height={112}
              points={last12WeeksKm}
              color="#22C55E"
              gridColor="rgba(148,163,184,0.18)"
            />
          </View>

          <View style={{ gap: spacing.md }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.heading3,
                  fontSize: 18,
                  color: colors.textPrimary,
                }}
              >
                Recent runs
              </Text>
              <Text
                style={{
                  fontFamily: fonts.labelBold,
                  fontSize: 12,
                  color: colors.textDim,
                }}
              >
                {runs.length} total
              </Text>
            </View>

            {runs.length === 0 ? (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderRadius: radius.xxl,
                  padding: spacing.xl,
                  alignItems: "center",
                  gap: spacing.md,
                }}
              >
                <Ionicons name="footsteps-outline" size={40} color={colors.textDim} />
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 15,
                    color: colors.textSecondary,
                    textAlign: "center",
                    lineHeight: 22,
                  }}
                >
                  Your runs will show up here once you record your first activity.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {runs.slice(0, 6).map((run) => (
                  <Pressable
                    key={run.id}
                    onPress={() =>
                      router.push(
                        `/(tabs)/tracking/run-path/${encodeURIComponent(run.id)}` as any,
                      )
                    }
                    style={({ pressed }) => ({
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderColor: cardBorder,
                      borderRadius: radius.xl,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                      opacity: pressed ? 0.96 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: spacing.md,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            backgroundColor: "rgba(34,197,94,0.14)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="walk-outline" size={18} color="#4ADE80" />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                            <Text
                              style={{
                                fontFamily: fonts.heading3,
                                fontSize: 20,
                                color: colors.textPrimary,
                              }}
                            >
                              {formatKm(run.distance_meters)}
                            </Text>
                            <Text
                              style={{
                                fontFamily: fonts.labelBold,
                                fontSize: 12,
                                color: colors.textSecondary,
                              }}
                            >
                              km
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontFamily: fonts.bodyMedium,
                              fontSize: 13,
                              color: colors.textSecondary,
                            }}
                          >
                            {new Date(run.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <Text
                          style={{
                            fontFamily: fonts.bodyBold,
                            fontSize: 15,
                            color: colors.textPrimary,
                          }}
                        >
                          {formatDurationClock(run.duration_seconds)}
                        </Text>
                        <Text
                          style={{
                            fontFamily: fonts.labelMedium,
                            fontSize: 12,
                            color: colors.textDim,
                          }}
                        >
                          Activity
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.labelCaps,
          fontSize: 10,
          color: "#86EFAC",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: 15,
          color: tone,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

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
  const padding = 14;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const max = Math.max(1, ...points);
  const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;

  const toX = (i: number) => padding + i * stepX;
  const toY = (v: number) => padding + (1 - v / max) * chartH;

  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(v).toFixed(2)}`)
    .join(" ");

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path
          d={`M ${padding} ${padding} L ${padding} ${height - padding}`}
          stroke={gridColor}
          strokeWidth={1}
        />
        <Path
          d={`M ${padding} ${height - padding} L ${width - padding} ${height - padding}`}
          stroke={gridColor}
          strokeWidth={1}
        />
        <Path d={d} stroke={color} strokeWidth={3} fill="none" />
        {points.map((v, i) => (
          <Circle
            key={i}
            cx={toX(i)}
            cy={toY(v)}
            r={4}
            fill={color}
            opacity={v === 0 ? 0.35 : 1}
          />
        ))}
      </Svg>
    </View>
  );
}

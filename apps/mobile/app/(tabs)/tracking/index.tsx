import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { fonts, radius, spacing } from "@/constants/theme";
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
import { shouldUseTeamTrackingFeatures } from "@/lib/tracking/teamTrackingGate";

type HeaderTab = "progress" | "workouts" | "activities";

export default function TrackingHomeScreen() {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const appRole = useAppSelector((s) => s.user.appRole);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);

  const [activeTab, setActiveTab] = useState<HeaderTab>("progress");
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
    reload();
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

  const monthInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const runDays = new Set<number>();
    let monthActivities = 0;

    runs.forEach((r) => {
      const d = new Date(r.date);
      if (d >= monthStart && d <= monthEnd) {
        runDays.add(d.getDate());
        monthActivities += 1;
      }
    });

    const weeksWithRuns = new Set<string>();
    runs.forEach((r) => {
      const d = new Date(r.date);
      if (d < monthStart || d > monthEnd) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${Math.ceil(d.getDate() / 7)}`;
      weeksWithRuns.add(key);
    });

    return {
      title: now.toLocaleString(undefined, { month: "long", year: "numeric" }),
      year,
      month,
      runDays,
      streakWeeks: weeksWithRuns.size,
      streakActivities: monthActivities,
    };
  }, [runs]);

  const cardBorder = "rgba(255,255,255,0.08)";
  const cardBg = colors.surface;
  const showTeamTab = shouldUseTeamTrackingFeatures({
    appRole,
    authTeamMembership,
    firstManagedAthlete: managedAthletes[0] ?? null,
  });

  const handleStartRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const store = useRunStore.getState();
    store.resetRun();
    store.setDestination(null);
    store.setGoalKm(null);
    store.setProgressNotifyEveryMeters(null);
    router.push("/(tabs)/tracking/active-run" as any);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
        contentContainerStyle={{
          paddingBottom: trackingScrollBottomPad(insets),
          paddingHorizontal: spacing.xl,
        }}
      >
        <TrackingHeaderTabs
          active="running"
          colors={colors}
          isDark={isDark}
          topInset={insets.top + 6}
          paddingHorizontal={0}
          showTeamTab={showTeamTab}
        />

        <TopBar
          topInset={8}
          onPressSettings={() => router.push("/(tabs)/more" as any)}
          onPressSearch={() => {
            // Placeholder for future activity search (no destination/map search).
          }}
          onPressAvatar={() => router.push("/(tabs)/more" as any)}
        />

        <View
          style={{
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
            backgroundColor: colors.background,
          }}
        >
          <SegmentedHeaderTabs
            value={activeTab}
            onChange={setActiveTab}
            accent={colors.accent}
            textPrimary={colors.textPrimary}
            textSecondary={colors.textSecondary}
          />
        </View>

        {activeTab === "progress" ? (
          <View style={{ gap: spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={handleStartRun}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: colors.accent,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <MaterialCommunityIcons
                  name="shoe-print"
                  size={18}
                  color={colors.accent}
                />
                <Text
                  style={{
                    fontFamily: fonts.accentBold,
                    fontSize: 15,
                    color: colors.accent,
                  }}
                >
                  Run
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: radius.xxl,
                padding: spacing.xl,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.heading2,
                  fontSize: 28,
                  color: colors.textPrimary,
                  marginBottom: spacing.lg,
                }}
              >
                This week
              </Text>

              <View style={{ flexDirection: "row" }}>
                <Stat
                  label="Distance"
                  value={`${formatKm(weeklyStats.totalDistance)} km`}
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                />
                <Stat
                  label="Time"
                  value={`${weeklyTime.h}h ${weeklyTime.m}m`}
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                />
                <Stat
                  label="Elev Gain"
                  value="0 m"
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                />
              </View>

              <View style={{ marginTop: spacing.xl }}>
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: spacing.sm,
                  }}
                >
                  Past 12 weeks
                </Text>
                <LineChart
                  width={Math.max(260, screenWidth - spacing.xl * 2 - 10)}
                  height={160}
                  points={last12WeeksKm}
                  color={colors.accent}
                  gridColor={colors.borderSubtle}
                />
              </View>
            </View>

            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: radius.xxl,
                padding: spacing.xl,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.heading2,
                  fontSize: 28,
                  color: colors.textPrimary,
                }}
              >
                {monthInfo.title}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: spacing.lg,
                }}
              >
                <SmallStat
                  label="Your Streak"
                  value={`${monthInfo.streakWeeks} Weeks`}
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                />
                <SmallStat
                  label="Streak Activities"
                  value={`${monthInfo.streakActivities}`}
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                />
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <CalendarMonth
                  year={monthInfo.year}
                  month={monthInfo.month}
                  runDays={monthInfo.runDays}
                  accent={colors.accent}
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                  dotBg={colors.surfaceHigh}
                />
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === "workouts" ? (
          <View style={{ gap: spacing.xl }}>
            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <RoundShortcut
                label="Maintain"
                icon={<Ionicons name="repeat" size={26} color="#FFF" />}
                bg="#7C3AED"
              />
              <RoundShortcut
                label="Build"
                icon={<Ionicons name="barbell-outline" size={26} color="#FFF" />}
                bg={colors.surfaceHigh}
              />
              <RoundShortcut
                label="Explore"
                icon={<Ionicons name="shuffle" size={26} color="#FFF" />}
                bg={colors.surfaceHigh}
              />
              <RoundShortcut
                label="Recover"
                icon={<Ionicons name="heart-outline" size={26} color="#FFF" />}
                bg={colors.surfaceHigh}
              />
            </View>

            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: radius.xxl,
                padding: spacing.xl,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.lg,
              }}
            >
              <Ionicons
                name="megaphone-outline"
                size={28}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.bodyMedium,
                  fontSize: 16,
                  color: colors.textPrimary,
                }}
              >
                Push yourself with longer or harder workouts.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: radius.xxl,
                padding: spacing.xl,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.heading2,
                  fontSize: 20,
                  color: colors.textPrimary,
                  marginBottom: spacing.md,
                }}
              >
                Progressive Run
              </Text>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                Gradually increase your pace to challenge your endurance.
              </Text>
              <View style={{ height: spacing.lg }} />
              <Pressable
                onPress={handleStartRun}
                style={({ pressed }) => ({
                  backgroundColor: colors.accent,
                  borderRadius: radius.pill,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: fonts.heading3,
                    fontSize: 16,
                    color: "#07070F",
                  }}
                >
                  Start run
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {activeTab === "activities" ? (
          <View style={{ gap: spacing.lg }}>
            <Text
              style={{
                fontFamily: fonts.heading2,
                fontSize: 22,
                color: colors.textPrimary,
                marginTop: spacing.sm,
              }}
            >
              Activities
            </Text>

            {runs.length === 0 ? (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderRadius: radius.xxl,
                  padding: spacing.xl,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}
                >
                  No activities yet. Start your first run to see it here.
                </Text>
                <View style={{ height: spacing.lg }} />
                <Pressable
                  onPress={handleStartRun}
                  style={({ pressed }) => ({
                    backgroundColor: colors.accent,
                    borderRadius: radius.pill,
                    paddingVertical: 14,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: fonts.heading3,
                      fontSize: 16,
                      color: "#07070F",
                    }}
                  >
                    Start run
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {runs.slice(0, 20).map((run) => (
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
                      padding: spacing.lg,
                      opacity: pressed ? 0.95 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View style={{ gap: 4 }}>
                        <Text
                          style={{
                            fontFamily: fonts.heading3,
                            fontSize: 16,
                            color: colors.textPrimary,
                          }}
                        >
                          {formatKm(run.distance_meters)} km
                        </Text>
                        <Text
                          style={{
                            fontFamily: fonts.bodyMedium,
                            fontSize: 12,
                            color: colors.textSecondary,
                          }}
                        >
                          {new Date(run.date).toLocaleDateString()}
                          {" · "}
                          {formatDurationClock(run.duration_seconds)}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

function TopBar({
  topInset,
  onPressAvatar,
  onPressSearch,
  onPressSettings,
}: {
  topInset: number;
  onPressAvatar: () => void;
  onPressSearch: () => void;
  onPressSettings: () => void;
}) {
  return (
    <View
      style={{
        paddingTop: topInset,
        paddingBottom: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.heading1,
          fontSize: 44,
          color: "#FFF",
          letterSpacing: -1,
        }}
      >
        You
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable
          onPress={onPressAvatar}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(148,163,184,0.25)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#FFF" }}>
            D
          </Text>
        </Pressable>

        <Pressable
          onPress={onPressSearch}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.75 : 1,
          })}
          accessibilityLabel="Search activities"
        >
          <Ionicons name="search" size={26} color="#FFF" />
        </Pressable>

        <Pressable
          onPress={onPressSettings}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.75 : 1,
          })}
          accessibilityLabel="Settings"
        >
          <View style={{ position: "relative" }}>
            <Ionicons name="settings-outline" size={26} color="#FFF" />
            <View
              style={{
                position: "absolute",
                right: -1,
                top: -1,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#FF3B30",
              }}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function SegmentedHeaderTabs({
  value,
  onChange,
  accent,
  textPrimary,
  textSecondary,
}: {
  value: HeaderTab;
  onChange: (v: HeaderTab) => void;
  accent: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const tabs: { key: HeaderTab; label: string }[] = [
    { key: "progress", label: "Progress" },
    { key: "workouts", label: "Workouts" },
    { key: "activities", label: "Activities" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
      }}
    >
      {tabs.map((t) => {
        const selected = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: spacing.lg,
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
              borderBottomWidth: 3,
              borderBottomColor: selected ? accent : "transparent",
            })}
          >
            <Text
              style={{
                fontFamily: selected ? fonts.heading3 : fonts.bodyBold,
                fontSize: 18,
                color: selected ? textPrimary : textSecondary,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stat({
  label,
  value,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: textSecondary }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.heading2, fontSize: 26, color: textPrimary, marginTop: 6 }}>
        {value}
      </Text>
    </View>
  );
}

function SmallStat({
  label,
  value,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: textSecondary }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.heading2, fontSize: 28, color: textPrimary, marginTop: 6 }}>
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

function CalendarMonth({
  year,
  month,
  runDays,
  accent,
  textPrimary,
  textSecondary,
  dotBg,
}: {
  year: number;
  month: number; // 0-11
  runDays: Set<number>;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  dotBg: string;
}) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  const offset = (firstDay + 6) % 7; // monday=0

  const cells: Array<number | null> = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing.md,
        }}
      >
        {labels.map((l, idx) => (
          <Text
            key={`${l}-${idx}`}
            style={{
              width: 38,
              textAlign: "center",
              fontFamily: fonts.bodyMedium,
              fontSize: 13,
              color: textSecondary,
            }}
          >
            {l}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, idx) => {
          const hasRun = d != null && runDays.has(d);
          return (
            <View
              key={idx}
              style={{
                width: `${100 / 7}%`,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              {d == null ? (
                <View style={{ width: 38, height: 38 }} />
              ) : (
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: hasRun ? accent : dotBg,
                    borderWidth: hasRun ? 0 : 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodyBold,
                      fontSize: 14,
                      color: hasRun ? "#07070F" : textPrimary,
                    }}
                  >
                    {d}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RoundShortcut({
  label,
  icon,
  bg,
}: {
  label: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: 16,
          color: "#FFF",
          marginTop: spacing.md,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

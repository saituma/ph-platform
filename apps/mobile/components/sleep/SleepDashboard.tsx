import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
  useAnimatedReaction,
  LayoutAnimationConfig,
  LinearTransition,
  interpolateColor,
} from "react-native-reanimated";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Moon,
  Waves,
  BrainCircuit,
  Clock,
  ChevronRight,
  Plus,
  ArrowLeft,
  Flame,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, G } from "react-native-svg";
import { useRouter } from "expo-router";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { fonts } from "@/constants/theme";
import { SleepRing } from "./SleepRing";
import { SleepLogSheet } from "./SleepLogSheet";
import { useSleepData, type SleepLogInput } from "./useSleepData";
import { useStreakStore } from "@/lib/streakStore";

const { width: SCREEN_W } = Dimensions.get("window");
const RING_SIZE = Math.min(SCREEN_W - 100, 240);

type TimeFilter = "today" | "week" | "month" | "year" | "all";

const FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "1 Week" },
  { key: "month", label: "1 Month" },
  { key: "year", label: "1 Year" },
  { key: "all", label: "All" },
];

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatHoursDecimal(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

function qualityLabel(q: number | null): string {
  if (!q) return "Not rated";
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return labels[q] ?? "Not rated";
}

function qualityColor(q: number | null, p: any, isDark: boolean): string {
  if (!q || q <= 2) return p.danger;
  if (q === 3) return p.warning;
  return isDark ? "#4CAF50" : p.accent;
}

function getSleepTips(quality: number | null): { icon: React.ReactNode; title: string; subtitle: string }[] {
  const tips = [
    { icon: <Moon size={18} color="#7B61FF" />, title: "Consistent Bedtime", subtitle: "Go to bed at the same time daily" },
    { icon: <Waves size={18} color="#30B0C7" />, title: "No Screens Before Bed", subtitle: "Avoid blue light 1 hour before sleep" },
  ];
  if (quality && quality <= 3) {
    tips.push({ icon: <BrainCircuit size={18} color="#F59E0B" />, title: "Room Temperature", subtitle: "Keep bedroom cool (18-20°C)" });
  }
  return tips;
}

// ── Animated counting number ──
function CountingNumber({
  value,
  suffix,
  style,
  suffixStyle,
  duration = 1400,
  delay = 400,
}: {
  value: number;
  suffix?: string;
  style: any;
  suffixStyle?: any;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState("0.00");
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = 0;
    anim.value = withDelay(
      delay,
      withTiming(value, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [value]);

  useAnimatedReaction(
    () => anim.value,
    (v) => {
      runOnJS(setDisplay)((v / 60).toFixed(2));
    },
    [anim],
  );

  return (
    <Text style={style}>
      {value > 0 ? display : "—"}
      {suffix ? <Text style={suffixStyle}>{suffix}</Text> : null}
    </Text>
  );
}

// ── Pressable with scale bounce ──
function ScalePressable({
  children,
  onPress,
  style,
  disabled,
  activeScale = 0.96,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  activeScale?: number;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(activeScale, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// ── Animated bar that fills from 0 ──
function AnimatedBar({
  percentage,
  color,
  delay: barDelay,
  height = 16,
  trackColor,
}: {
  percentage: number;
  color: string;
  delay: number;
  height?: number;
  trackColor: string;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = 0;
    width.value = withDelay(
      barDelay,
      withTiming(Math.min(100, percentage), { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
  }, [percentage, barDelay]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    height,
    borderRadius: height / 2,
    backgroundColor: color,
  }));

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: trackColor, overflow: "hidden" }}>
      <Animated.View style={fillStyle} />
    </View>
  );
}

// ── Animated quality bar segments ──
function AnimatedQualityBar({
  core,
  rem,
  light,
  awake,
  coreColor,
  remColor,
  lightColor,
  awakeColor,
  total,
}: {
  core: number;
  rem: number;
  light: number;
  awake: number;
  coreColor: string;
  remColor: string;
  lightColor: string;
  awakeColor: string;
  total: number;
}) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = 0;
    anim.value = withDelay(500, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [core, rem, light, awake]);

  const coreStyle = useAnimatedStyle(() => ({ flex: core * anim.value || 0.001 }));
  const remStyle = useAnimatedStyle(() => ({ flex: rem * anim.value || 0.001 }));
  const lightStyle = useAnimatedStyle(() => ({ flex: light * anim.value || 0.001 }));
  const awakeStyle = useAnimatedStyle(() => ({ flex: Math.max(awake, 1) * anim.value || 0.001 }));

  return (
    <View style={styles.barContainer}>
      <Animated.View style={[styles.barSegment, coreStyle, { backgroundColor: coreColor, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]} />
      <Animated.View style={[styles.barSegment, remStyle, { backgroundColor: remColor }]} />
      <Animated.View style={[styles.barSegment, lightStyle, { backgroundColor: lightColor }]} />
      <Animated.View style={[styles.barSegment, awakeStyle, { backgroundColor: awakeColor, borderTopRightRadius: 8, borderBottomRightRadius: 8 }]} />
    </View>
  );
}

// ── Animated stage stat pill ──
const StageStatPill = React.memo(function StageStatPill({
  icon,
  iconBg,
  label,
  value,
  textColor,
  subtextColor,
  delay: pillDelay,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  textColor: string;
  subtextColor: string;
  delay: number;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(pillDelay, withSpring(1, { damping: 12, stiffness: 200 }));
    opacity.value = withDelay(pillDelay, withTiming(1, { duration: 300 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.stagePill, animStyle]}>
      <Text style={[styles.stageLabel, { color: subtextColor }]}>{label}</Text>
      <Text style={[styles.stageValue, { color: textColor }]}>{value}</Text>
      <View style={[styles.stageIcon, { backgroundColor: iconBg }]}>{icon}</View>
    </Animated.View>
  );
});

const LegendDot = React.memo(function LegendDot({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendCircle, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
});

// ── Filter pill with animated background ──
function FilterPill({
  label,
  isActive,
  onPress,
  activeColor,
  inactiveColor,
  activeTextColor,
  inactiveTextColor,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  activeTextColor: string;
  inactiveTextColor: string;
}) {
  const bg = useSharedValue(isActive ? 1 : 0);
  const pillScale = useSharedValue(1);

  useEffect(() => {
    bg.value = withTiming(isActive ? 1 : 0, { duration: 250 });
    if (isActive) {
      pillScale.value = withSequence(
        withTiming(1.08, { duration: 100 }),
        withSpring(1, { damping: 14, stiffness: 250 }),
      );
    }
  }, [isActive]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(bg.value, [0, 1], [inactiveColor, activeColor]),
    transform: [{ scale: pillScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(bg.value, [0, 1], [inactiveTextColor, activeTextColor]),
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Animated.View style={[styles.filterPill, pillStyle]}>
        <Animated.Text style={[styles.filterText, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Tip row with stagger animation ──
function TipRow({
  tip,
  index,
  isLast,
  dividerColor,
  textPrimary,
  textMuted,
  iconBg,
}: {
  tip: { icon: React.ReactNode; title: string; subtitle: string };
  index: number;
  isLast: boolean;
  dividerColor: string;
  textPrimary: string;
  textMuted: string;
  iconBg: string;
}) {
  return (
    <ScalePressable activeScale={0.98}>
      <Animated.View
        entering={FadeInDown.delay(400 + index * 100).duration(300)}
        style={[
          styles.tipRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
        ]}
      >
        <View style={[styles.tipIcon, { backgroundColor: iconBg }]}>
          {tip.icon}
        </View>
        <View style={styles.tipText}>
          <Text style={[styles.tipTitle, { color: textPrimary }]}>{tip.title}</Text>
          <Text style={[styles.tipSubtitle, { color: textMuted }]}>{tip.subtitle}</Text>
        </View>
        <ChevronRight size={16} color={textMuted} />
      </Animated.View>
    </ScalePressable>
  );
}

// ── Streak badge ──
function StreakBadge() {
  const streak = useStreakStore((s) => s.currentStreak);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(600, withSpring(1, { damping: 10, stiffness: 250 }));
    opacity.value = withDelay(500, withTiming(1, { duration: 300 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (streak < 1) return null;

  return (
    <Animated.View style={[styles.streakBadge, animStyle]}>
      <Flame size={14} color="#FF9500" fill="#FF9500" />
      <Text style={styles.streakText}>{streak}</Text>
    </Animated.View>
  );
}

export const SleepDashboard = React.memo(function SleepDashboard() {
  const p = useAdminPastel();
  const isDark = useColorScheme() === "dark";
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const profile = useAppSelector((s) => s.user.profile);
  const token = useAppSelector((s) => s.user.token);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";

  const [filter, setFilter] = useState<TimeFilter>("month");
  const { logs, todayLog, loading, refetch, saveLog } = useSleepData(filter);
  const sheetRef = useRef<BottomSheetModal>(null);

  const heroBg = isDark ? "#000000" : p.pageBg;
  const heroText = isDark ? "#FFFFFF" : p.textPrimary;
  const heroSubtext = isDark ? "rgba(255,255,255,0.6)" : p.textMuted;
  const heroBtnBg = isDark ? "rgba(255,255,255,0.12)" : p.inputBg;
  const heroCtaBg = isDark ? "rgba(255,255,255,0.15)" : p.inputBg;
  const coreColor = isDark ? "#2D6A1A" : "#2F9F3D";
  const remColor = isDark ? "#FFB020" : "#E8970A";
  const postColor = isDark ? "#7ABCD4" : "#5B8FA6";
  const trackColor = isDark ? "rgba(255,255,255,0.08)" : p.divider;

  const totalMin = todayLog?.totalMinutes ?? 0;
  const coreMin = todayLog?.deepMinutes ?? Math.round(totalMin * 0.55);
  const remMin = todayLog?.remMinutes ?? Math.round(totalMin * 0.22);
  const lightMin = todayLog?.lightMinutes ?? Math.round(totalMin * 0.18);
  const awakeMin = todayLog?.awakeMinutes ?? Math.round(totalMin * 0.05);

  const maxMin = 600;
  const coreProg = totalMin > 0 ? coreMin / maxMin : 0;
  const remProg = totalMin > 0 ? remMin / maxMin : 0;
  const lightProg = totalMin > 0 ? lightMin / maxMin : 0;

  const ringLayers = useMemo(
    () => [
      { progress: coreProg, color: coreColor, radius: RING_SIZE / 2 - 8 },
      { progress: remProg, color: remColor, radius: RING_SIZE / 2 - 30 },
      { progress: lightProg, color: postColor, radius: RING_SIZE / 2 - 52 },
    ],
    [coreProg, remProg, lightProg, coreColor, remColor, postColor],
  );

  const avgQuality = useMemo(() => {
    const rated = logs.filter((l) => l.quality);
    if (rated.length === 0) return null;
    return Math.round(rated.reduce((sum, l) => sum + (l.quality ?? 0), 0) / rated.length);
  }, [logs]);

  const prevMonthAvg = useMemo(() => {
    const now = new Date();
    const prevKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
    const prevLogs = logs.filter((l) => l.dateKey.startsWith(prevKey) && l.quality);
    if (prevLogs.length === 0) return null;
    return Math.round(prevLogs.reduce((sum, l) => sum + (l.quality ?? 0), 0) / prevLogs.length);
  }, [logs]);

  const qualityImprovement = avgQuality && prevMonthAvg
    ? Math.round(((avgQuality - prevMonthAvg) / prevMonthAvg) * 100)
    : null;

  const handleSave = useCallback(
    async (input: SleepLogInput) => {
      const log = await saveLog(input);
      if (log) {
        useStreakStore.getState().recordSession(input.totalMinutes / 60);
        if (token) void useStreakStore.getState().syncToServer(token);
      }
    },
    [saveLog],
  );

  const openSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sheetRef.current?.present();
  }, []);

  const tips = getSleepTips(todayLog?.quality ?? avgQuality);

  // CTA button animation
  const ctaScale = useSharedValue(0.9);
  const ctaOpacity = useSharedValue(0);
  useEffect(() => {
    ctaScale.value = withDelay(900, withSpring(1, { damping: 12, stiffness: 180 }));
    ctaOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);
  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
    opacity: ctaOpacity.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={p.accent} />
        }
      >
        {/* ── Hero Card: "You Slept for" ── */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(500).springify().damping(18)}
          style={[styles.heroCard, { backgroundColor: heroBg, paddingTop: insets.top + 16 }]}
        >
          {/* Header */}
          <View style={styles.heroHeader}>
            <ScalePressable onPress={() => router.back()} activeScale={0.85}>
              <View style={{ padding: 4 }}>
                <ArrowLeft size={22} color={heroText} />
              </View>
            </ScalePressable>
            <View style={styles.heroHeaderRight}>
              <StreakBadge />
              <ScalePressable
                onPress={openSheet}
                activeScale={0.85}
                style={[styles.addBtn, { backgroundColor: heroBtnBg }]}
              >
                <Plus size={18} color={heroText} />
              </ScalePressable>
            </View>
          </View>

          <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(200).duration(400)}>
            <Text style={[styles.heroLabel, { color: heroSubtext }]}>You Slept for</Text>
          </Animated.View>

          <CountingNumber
            value={totalMin}
            suffix="h"
            style={[styles.heroNumber, { color: heroText }]}
            suffixStyle={[styles.heroUnit, { color: heroSubtext }]}
            delay={300}
            duration={1400}
          />

          {/* Ring */}
          <View style={styles.ringContainer}>
            <SleepRing
              size={RING_SIZE}
              strokeWidth={14}
              layers={ringLayers}
              centerText={totalMin > 0 ? formatHoursDecimal(totalMin) : "—"}
              centerSubtext="hours"
              centerTextColor={heroText}
              centerSubtextColor={heroSubtext}
              trackColor={trackColor}
              animate={!reduceMotion}
            />
          </View>

          {/* Stage Stats */}
          <View style={styles.stageRow}>
            <StageStatPill
              icon={<Moon size={14} color="#FFF" />}
              iconBg={coreColor}
              label="Core"
              value={formatHours(coreMin)}
              textColor={heroText}
              subtextColor={heroSubtext}
              delay={800}
            />
            <StageStatPill
              icon={<Waves size={14} color="#FFF" />}
              iconBg={remColor}
              label="REM"
              value={formatHours(remMin)}
              textColor={heroText}
              subtextColor={heroSubtext}
              delay={950}
            />
            <StageStatPill
              icon={<BrainCircuit size={14} color="#FFF" />}
              iconBg={postColor}
              label="Light"
              value={formatHours(lightMin)}
              textColor={heroText}
              subtextColor={heroSubtext}
              delay={1100}
            />
          </View>

          {/* CTA */}
          <ScalePressable onPress={openSheet} activeScale={0.95}>
            <Animated.View style={[styles.ctaBtn, { backgroundColor: heroCtaBg }, ctaAnimStyle]}>
              <Text style={[styles.ctaBtnText, { color: heroText }]}>
                {todayLog ? "Update Today's Log" : "Log Tonight's Sleep"}
              </Text>
              <ChevronRight size={16} color={heroText} />
            </Animated.View>
          </ScalePressable>
        </Animated.View>

        <View style={styles.content}>
          {/* ── Sleep Quality Card ── */}
          <ScalePressable activeScale={0.98}>
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(150).duration(400).springify().damping(18)}
              style={[styles.card, { backgroundColor: p.inputBg, shadowColor: p.shadow }]}
            >
              <Text style={[styles.cardTitle, { color: p.textPrimary }]}>Sleep Quality</Text>
              {qualityImprovement !== null && (
                <Animated.View entering={FadeIn.delay(600).duration(300)}>
                  <Text style={[styles.qualitySubtitle, { color: p.textMuted }]}>
                    {qualityImprovement >= 0
                      ? `${qualityImprovement}% better from last month`
                      : `${Math.abs(qualityImprovement)}% lower from last month`}
                  </Text>
                </Animated.View>
              )}

              {/* Legend */}
              <View style={styles.legendRow}>
                <LegendDot color={coreColor} label="Core" textColor={p.textSecondary} />
                <LegendDot color={remColor} label="REM" textColor={p.textSecondary} />
                <LegendDot color={postColor} label="Light" textColor={p.textSecondary} />
                <LegendDot color={p.danger} label="Awake" textColor={p.textSecondary} />
              </View>

              {/* Animated quality bar */}
              <View style={styles.qualityBar}>
                {totalMin > 0 ? (
                  <AnimatedQualityBar
                    core={coreMin}
                    rem={remMin}
                    light={lightMin}
                    awake={awakeMin}
                    coreColor={coreColor}
                    remColor={remColor}
                    lightColor={postColor}
                    awakeColor={p.danger}
                    total={totalMin}
                  />
                ) : (
                  <View style={[styles.barContainer, { backgroundColor: isDark ? p.inputBg : "#F1F5F2" }]}>
                    <Text style={[styles.noDataText, { color: p.textMuted }]}>No data yet</Text>
                  </View>
                )}
              </View>

              {/* Average quality */}
              {avgQuality && (
                <Animated.View entering={FadeIn.delay(800).duration(300)} style={styles.avgRow}>
                  <Text style={[styles.avgLabel, { color: p.textMuted }]}>Average Quality</Text>
                  <Text style={[styles.avgValue, { color: qualityColor(avgQuality, p, isDark) }]}>
                    {qualityLabel(avgQuality)}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          </ScalePressable>

          {/* ── Sleep Insights Card ── */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(300).duration(400).springify().damping(18)}
            style={[styles.card, { backgroundColor: p.inputBg, shadowColor: p.shadow }]}
          >
            <Text style={[styles.cardTitle, { color: p.textPrimary }]}>Sleep Insights</Text>

            {/* Filters */}
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <FilterPill
                  key={f.key}
                  label={f.label}
                  isActive={filter === f.key}
                  onPress={() => setFilter(f.key)}
                  activeColor={isDark ? p.accent : "#2C3E2E"}
                  inactiveColor={isDark ? p.inputBg : "#F1F5F2"}
                  activeTextColor={isDark ? "#0C0A09" : "#FFFFFF"}
                  inactiveTextColor={p.textMuted}
                />
              ))}
            </View>

            {/* History bars */}
            {logs.length > 0 ? (
              <View style={styles.historyContainer}>
                {logs.slice(0, 7).map((log, i) => (
                  <Animated.View
                    key={log.id}
                    entering={reduceMotion ? undefined : FadeInDown.delay(400 + i * 80).duration(300)}
                    style={styles.historyRow}
                  >
                    <Text style={[styles.historyDate, { color: p.textMuted }]}>
                      {log.dateKey.slice(5)}
                    </Text>
                    <View style={styles.historyBarWrap}>
                      <AnimatedBar
                        percentage={(log.totalMinutes / 600) * 100}
                        color={qualityColor(log.quality, p, isDark)}
                        delay={500 + i * 100}
                        trackColor={isDark ? p.inputBg : "#F1F5F2"}
                      />
                    </View>
                    <Text style={[styles.historyValue, { color: p.textPrimary }]}>
                      {formatHours(log.totalMinutes)}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyInsights}>
                <Moon size={32} color={p.textMuted} />
                <Text style={[styles.emptyText, { color: p.textMuted }]}>
                  Start logging sleep to see insights
                </Text>
              </View>
            )}
          </Animated.View>

          {/* ── Tips Card ── */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(450).duration(400).springify().damping(18)}
            style={[styles.card, { backgroundColor: p.inputBg, shadowColor: p.shadow }]}
          >
            <Text style={[styles.cardTitle, { color: p.textPrimary }]}>Sleep Tips</Text>
            {tips.map((tip, i) => (
              <TipRow
                key={i}
                tip={tip}
                index={i}
                isLast={i === tips.length - 1}
                dividerColor={p.divider}
                textPrimary={p.textPrimary}
                textMuted={p.textMuted}
                iconBg={isDark ? p.inputBg : "#F5F3FF"}
              />
            ))}
          </Animated.View>
        </View>
      </ScrollView>

      <SleepLogSheet sheetRef={sheetRef} onSave={handleSave} />
    </View>
  );
});

const styles = StyleSheet.create({
  heroCard: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    fontFamily: fonts.statNumber,
    fontSize: 15,
    color: "#FF9500",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: {
    fontFamily: fonts.heading2,
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: -0.2,
  },
  heroNumber: {
    fontFamily: fonts.heroNumber,
    fontSize: 56,
    color: "#FFFFFF",
    letterSpacing: -2,
    marginTop: -4,
  },
  heroUnit: {
    fontFamily: fonts.bodyMedium,
    fontSize: 24,
    color: "rgba(255,255,255,0.6)",
  },
  ringContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  stageRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  stagePill: {
    alignItems: "center",
    gap: 4,
  },
  stageLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  stageValue: {
    fontFamily: fonts.statNumber,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  stageIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 100,
    marginTop: 20,
  },
  ctaBtnText: {
    fontFamily: fonts.accentBold,
    fontSize: 15,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontFamily: fonts.heading1,
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  qualitySubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 12,
  },
  qualityBar: {
    marginBottom: 12,
  },
  barContainer: {
    height: 24,
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  barSegment: {
    height: "100%",
  },
  noDataText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  avgRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avgLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 13,
  },
  avgValue: {
    fontFamily: fonts.accentBold,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  filterText: {
    fontFamily: fonts.labelBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  historyContainer: {
    gap: 10,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyDate: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    width: 42,
  },
  historyBarWrap: {
    flex: 1,
  },
  historyBarTrack: {
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  historyBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  historyValue: {
    fontFamily: fonts.statNumber,
    fontSize: 13,
    width: 40,
    textAlign: "right",
  },
  emptyInsights: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    textAlign: "center",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  tipSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
  },
});

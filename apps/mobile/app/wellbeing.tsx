import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import {
  ArrowLeft,
  Smile,
  Zap,
  AlertTriangle,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { InlineErrorBanner } from "@/components/ui/InlineErrorBanner";
import { WellnessBarTrend } from "@/components/wellness/WellnessBarTrend";
import { ReminderControl } from "@/components/wellness/ReminderControl";
import { buildDaySeries, seriesAverage } from "@/components/wellness/buildDaySeries";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { useWellbeingData, type WellbeingLogInput } from "@/hooks/useWellbeingData";

const { width: _SCREEN_W } = Dimensions.get("window");
const SCREEN_W = Platform.isPad ? Math.min(_SCREEN_W, 560) : _SCREEN_W;
const RING_SIZE = Math.min(Math.floor((SCREEN_W - 80) / 3), 100);
const STROKE_WIDTH = 10;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type MetricConfig = {
  key: "mood" | "energy" | "pain";
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  labels: string[];
};

function RoundSlider({
  value,
  max,
  color,
  bgColor,
  size,
  icon,
}: {
  value: number;
  max: number;
  onChange?: (v: number) => void;
  color: string;
  bgColor: string;
  size: number;
  icon: React.ReactNode;
}) {
  const strokeW = STROKE_WIDTH;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const progress = value / max;
  const strokeDashoffset = circ * (1 - progress);

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={bgColor}
            strokeWidth={strokeW}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeW}
            fill="none"
            strokeDasharray={`${circ}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          {icon}
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 22,
              color,
              marginTop: 2,
            }}
          >
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

function DotSelector({
  value,
  max,
  onChange,
  color,
  bgColor,
  labels,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  color: string;
  bgColor: string;
  labels: string[];
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const active = n <= value;
          return (
            <Pressable
              key={n}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(n);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: active ? color : bgColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 16,
                  color: active ? "#000" : color,
                }}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {labels[value - 1] ? (
        <Text
          style={{
            fontFamily: "Satoshi-Medium",
            fontSize: 13,
            color,
            textAlign: "center",
            opacity: 0.8,
          }}
        >
          {labels[value - 1]}
        </Text>
      ) : null}
    </View>
  );
}

export default function WellbeingScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const capabilities = useAppSelector((s) => s.user.capabilities);

  const { logs, todayLog, isLoading, isSaving, error, loadLogs, saveLog } = useWellbeingData(token);

  const [mood, setMood] = useState(todayLog?.mood ?? 3);
  const [energy, setEnergy] = useState(todayLog?.energy ?? 3);
  const [pain, setPain] = useState(todayLog?.pain ?? 1);
  const [saved, setSaved] = useState(false);
  const isDirtyRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (todayLog && !isDirtyRef.current) {
      setMood(todayLog.mood);
      setEnergy(todayLog.energy);
      setPain(todayLog.pain);
    }
  }, [todayLog]);

  const metrics: MetricConfig[] = useMemo(
    () => [
      {
        key: "mood",
        label: "Mood",
        icon: <Smile size={22} color="#FFB020" strokeWidth={2} />,
        color: "#FFB020",
        bgColor: "rgba(255,176,32,0.15)",
        labels: ["Very Low", "Low", "Okay", "Good", "Great"],
      },
      {
        key: "energy",
        label: "Energy",
        icon: <Zap size={22} color="#9EF700" strokeWidth={2} />,
        color: "#9EF700",
        bgColor: "rgba(158,247,0,0.15)",
        labels: ["Exhausted", "Tired", "Normal", "Energized", "Peak"],
      },
      {
        key: "pain",
        label: "Pain",
        icon: <AlertTriangle size={22} color="#FF6B6B" strokeWidth={2} />,
        color: "#FF6B6B",
        bgColor: "rgba(255,107,107,0.15)",
        labels: ["None", "Mild", "Moderate", "High", "Severe"],
      },
    ],
    [],
  );

  const values = { mood, energy, pain };
  const dirtySet = useCallback((setter: (v: number) => void) => (v: number) => {
    isDirtyRef.current = true;
    setter(v);
  }, []);
  const setters = {
    mood: dirtySet(setMood),
    energy: dirtySet(setEnergy),
    pain: dirtySet(setPain),
  };

  const handleSave = useCallback(async () => {
    const input: WellbeingLogInput = {
      dateKey: todayKey(),
      mood,
      energy,
      pain,
    };
    try {
      const result = await saveLog(input);
      if (result) {
        isDirtyRef.current = false;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [mood, energy, pain, saveLog]);

  const recentLogs = useMemo(
    () => [...logs].sort((a, b) => (b.dateKey ?? "").localeCompare(a.dateKey ?? "")).slice(0, 7),
    [logs],
  );

  const renderLogRow = useCallback(
    ({ item: log, index: idx }: { item: typeof recentLogs[number]; index: number; }) => {
      const d = new Date(log.dateKey + "T00:00:00");
      const isToday = log.dateKey === todayKey();
      const dayLabel = isToday
        ? "Today"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            borderBottomWidth: idx < recentLogs.length - 1 ? 1 : 0,
            borderBottomColor: p.border,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 14, color: p.textPrimary }}>
              {dayLabel}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <MetricBadge label="Mood" value={log.mood} color="#FFB020" bgColor="rgba(255,176,32,0.12)" />
              <MetricBadge label="Energy" value={log.energy} color="#9EF700" bgColor="rgba(158,247,0,0.12)" />
              <MetricBadge label="Pain" value={log.pain} color="#FF6B6B" bgColor="rgba(255,107,107,0.12)" />
            </View>
          </View>
          {log.coachFeedback && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.accent }} />
          )}
        </View>
      );
    },
    [p, recentLogs.length],
  );

  const ListHeader = useCallback(
    () => (
      <View style={{ gap: 20 }}>
        {error && logs.length === 0 ? (
          <InlineErrorBanner message={error} onRetry={() => loadLogs(true)} retrying={isLoading} />
        ) : null}

        {/* Today's Check-in Card */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <View style={{ backgroundColor: p.cardWhite, borderRadius: 24, padding: 24, gap: 28 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary, letterSpacing: -0.3 }}>
                How are you feeling?
              </Text>
              <Text style={{ fontFamily: "Satoshi-Regular", fontSize: 14, color: p.textSecondary }}>
                {todayLog ? "Update today's check-in" : "Log your daily check-in"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              {metrics.map((m) => (
                <View key={m.key} style={{ alignItems: "center", gap: 8 }}>
                  <RoundSlider
                    value={values[m.key]}
                    max={5}
                    onChange={setters[m.key]}
                    color={m.color}
                    bgColor={m.bgColor}
                    size={RING_SIZE}
                    icon={m.icon}
                  />
                  <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 13, color: p.textSecondary, letterSpacing: 0.3 }}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ gap: 20 }}>
              {metrics.map((m, idx) => (
                <Animated.View key={m.key} entering={FadeInUp.delay(100 * idx).duration(300)}>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: m.bgColor,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {m.icon}
                      </View>
                      <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 15, color: p.textPrimary }}>
                        {m.label}
                      </Text>
                    </View>
                    <DotSelector
                      value={values[m.key]}
                      max={5}
                      onChange={setters[m.key]}
                      color={m.color}
                      bgColor={m.bgColor}
                      labels={m.labels}
                    />
                  </View>
                </Animated.View>
              ))}
            </View>

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={{
                backgroundColor: saved ? "#22c55e" : p.accent,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {saved ? (
                <>
                  <Check size={20} color="#000" strokeWidth={2.5} />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: "#000" }}>Saved!</Text>
                </>
              ) : (
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.buttonPrimaryText }}>
                  {isSaving ? "Saving..." : todayLog ? "Update Check-in" : "Save Check-in"}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400).springify()}>
          <ReminderControl kind="wellbeing" />
        </Animated.View>

        {logs.length > 1 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
            <View style={{ backgroundColor: p.cardWhite, borderRadius: 24, padding: 20, gap: 18 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, letterSpacing: -0.3 }}>
                Last 7 days
              </Text>
              {metrics.map((m) => {
                const points = buildDaySeries(logs, 7, (l) => l[m.key] ?? null);
                const avg = seriesAverage(points);
                return (
                  <WellnessBarTrend
                    key={m.key}
                    title={m.label}
                    points={points}
                    max={5}
                    color={m.color}
                    summary={avg != null ? `${avg.toFixed(1)} avg` : undefined}
                  />
                );
              })}
            </View>
          </Animated.View>
        )}

        {recentLogs.length > 0 && (
          <View style={{ backgroundColor: p.cardWhite, borderRadius: 24, padding: 20, paddingBottom: 4 }}>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, letterSpacing: -0.3, marginBottom: 8 }}>
              Recent History
            </Text>
          </View>
        )}
      </View>
    ),
    [error, handleSave, isLoading, isSaving, loadLogs, logs, metrics, p, recentLogs.length, saved, setters, todayLog, values],
  );

  if (capabilities?.wellbeing === false) {
    return (
      <View style={{ flex: 1, backgroundColor: p.pageBg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
          style={{ position: "absolute", top: insets.top + 16, left: 20 }}
        >
          <ArrowLeft
            size={20}
            color={p.textMuted}
          />
        </Pressable>
        <AlertTriangle size={32} color={p.textMuted} />
        <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 16, color: p.textMuted }}>
          Not available on your plan
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: p.cardWhite,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color={p.textPrimary} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary, letterSpacing: -0.3 }}>
          Wellbeing
        </Text>
      </View>

      <FlashList
        data={recentLogs}
        renderItem={renderLogRow}
        keyExtractor={(log: typeof recentLogs[number]) => String(log.id)}
        estimatedItemSize={88}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => loadLogs(true)} tintColor={p.accent} />
        }
      />
    </View>
  );
}

function MetricBadge({
  label,
  value,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: bgColor,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontFamily: "Satoshi-Medium",
          fontSize: 11,
          color,
          opacity: 0.8,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 13,
          color,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

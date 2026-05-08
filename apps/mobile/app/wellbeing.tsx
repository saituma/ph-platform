import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle } from "react-native-svg";
import {
  ArrowLeft,
  Smile,
  Zap,
  AlertTriangle,
  Check,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { useWellbeingData, type WellbeingLogInput } from "@/hooks/useWellbeingData";

const { width: SCREEN_W } = Dimensions.get("window");
const RING_SIZE = Math.min(Math.floor((SCREEN_W - 80) / 3), 100);
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
  onChange,
  color,
  bgColor,
  size,
  icon,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
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

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleTap = useCallback(
    (newVal: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newVal);
    },
    [onChange],
  );

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
  const { logs, todayLog, isLoading, isSaving, loadLogs, saveLog } = useWellbeingData(token);

  const [mood, setMood] = useState(todayLog?.mood ?? 3);
  const [energy, setEnergy] = useState(todayLog?.energy ?? 3);
  const [pain, setPain] = useState(todayLog?.pain ?? 1);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (todayLog) {
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
  const setters = {
    mood: setMood,
    energy: setEnergy,
    pain: setPain,
  };

  const handleSave = useCallback(async () => {
    const input: WellbeingLogInput = {
      dateKey: todayKey(),
      mood,
      energy,
      pain,
    };
    const result = await saveLog(input);
    if (result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [mood, energy, pain, saveLog]);

  const recentLogs = logs.slice(0, 7);

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      {/* Header */}
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
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 22,
            color: p.textPrimary,
            letterSpacing: -0.3,
          }}
        >
          Wellbeing
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => loadLogs(true)} tintColor={p.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Check-in Card */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <View
            style={{
              backgroundColor: p.cardWhite,
              borderRadius: 24,
              padding: 24,
              gap: 28,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 20,
                  color: p.textPrimary,
                  letterSpacing: -0.3,
                }}
              >
                How are you feeling?
              </Text>
              <Text
                style={{
                  fontFamily: "Satoshi-Regular",
                  fontSize: 14,
                  color: p.textSecondary,
                }}
              >
                {todayLog ? "Update today's check-in" : "Log your daily check-in"}
              </Text>
            </View>

            {/* Ring indicators row */}
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
                  <Text
                    style={{
                      fontFamily: "Satoshi-Bold",
                      fontSize: 13,
                      color: p.textSecondary,
                      letterSpacing: 0.3,
                    }}
                  >
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Dot selectors */}
            <View style={{ gap: 20 }}>
              {metrics.map((m, idx) => (
                <Animated.View
                  key={m.key}
                  entering={FadeInUp.delay(100 * idx).duration(300)}
                >
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
                      <Text
                        style={{
                          fontFamily: "Satoshi-Bold",
                          fontSize: 15,
                          color: p.textPrimary,
                        }}
                      >
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

            {/* Save button */}
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
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 16,
                      color: "#000",
                    }}
                  >
                    Saved!
                  </Text>
                </>
              ) : (
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 16,
                    color: p.buttonPrimaryText,
                  }}
                >
                  {isSaving ? "Saving..." : todayLog ? "Update Check-in" : "Save Check-in"}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Recent History */}
        {recentLogs.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
            <View
              style={{
                backgroundColor: p.cardWhite,
                borderRadius: 24,
                padding: 20,
                gap: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 18,
                  color: p.textPrimary,
                  letterSpacing: -0.3,
                }}
              >
                Recent History
              </Text>

              {recentLogs.map((log, idx) => {
                const d = new Date(log.dateKey + "T00:00:00");
                const isToday = log.dateKey === todayKey();
                const dayLabel = isToday
                  ? "Today"
                  : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

                return (
                  <Animated.View
                    key={log.id}
                    entering={FadeInUp.delay(50 * idx).duration(250)}
                  >
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
                        <Text
                          style={{
                            fontFamily: "Satoshi-Bold",
                            fontSize: 14,
                            color: p.textPrimary,
                          }}
                        >
                          {dayLabel}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <MetricBadge
                            label="Mood"
                            value={log.mood}
                            color="#FFB020"
                            bgColor="rgba(255,176,32,0.12)"
                          />
                          <MetricBadge
                            label="Energy"
                            value={log.energy}
                            color="#9EF700"
                            bgColor="rgba(158,247,0,0.12)"
                          />
                          <MetricBadge
                            label="Pain"
                            value={log.pain}
                            color="#FF6B6B"
                            bgColor="rgba(255,107,107,0.12)"
                          />
                        </View>
                      </View>
                      {log.coachFeedback && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: p.accent,
                          }}
                        />
                      )}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>
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

import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { ArrowLeft, CheckCircle, PartyPopper } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useMyGoals, useLogGoalProgress } from "@/hooks/goals/useMyGoals";

const RING_SIZE = 120;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function GoalDetailScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { isDark } = useAppTheme();
  const p = useAdminPastel();
  const token = useAppSelector((s) => s.user.token);

  const { goals, isLoading } = useMyGoals(token);
  const logProgress = useLogGoalProgress(token);
  const [logValue, setLogValue] = useState("");

  const goal = useMemo(() => goals.find((g) => g.id === Number(goalId)) ?? null, [goals, goalId]);
  const isManualUnit = goal?.unit === "reps" || goal?.unit === "custom";
  const unitLabel = goal ? (goal.unit === "custom" ? (goal.customUnit ?? "") : goal.unit) : "";

  const pct = goal ? goal.percentage / 100 : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - pct);

  const handleLogProgress = () => {
    const value = Number(logValue);
    if (!goal || !Number.isFinite(value) || value <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logProgress.mutate(
      { goalId: goal.id, value },
      { onSuccess: () => setLogValue("") },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: insets.top ? 0 : 12, paddingBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: p.cardWhite }}
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ArrowLeft size={20} color={p.accent} />
        </Pressable>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary, letterSpacing: -0.5 }} numberOfLines={1}>
          {goal?.title ?? "Goal"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 16 }} showsVerticalScrollIndicator={false}>
        {isLoading && !goal ? (
          <Skeleton height={280} style={{ borderRadius: 22 }} />
        ) : !goal ? (
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted, textAlign: "center", paddingTop: 60 }}>
            This goal is no longer available.
          </Text>
        ) : (
          <>
            <View
              style={{
                backgroundColor: goal.completed ? p.cardMint : p.cardWhite,
                borderRadius: 28,
                padding: 24,
                alignItems: "center",
                gap: 16,
              }}
            >
              <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={goal.completed ? "rgba(46,125,50,0.15)" : p.accentSoft}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={p.accent}
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>
                <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
                  {goal.completed ? (
                    <CheckCircle size={40} color={p.accent} />
                  ) : (
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 26, color: p.accent }}>{Math.round(pct * 100)}%</Text>
                  )}
                </View>
              </View>

              {goal.completed ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <PartyPopper size={16} color={p.accent} />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.accent }}>
                    Completed{goal.completedAt ? ` · ${new Date(goal.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
                  {goal.progressValue.toFixed(1)} / {goal.targetValue} {unitLabel}
                </Text>
              )}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {goal.dueDate && (
                  <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: p.inputBg }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textPrimary }}>
                      Due {new Date(goal.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                )}
                {goal.coachName && (
                  <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: p.inputBg }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textPrimary }}>by {goal.coachName}</Text>
                  </View>
                )}
              </View>
            </View>

            {goal.description ? (
              <View style={{ borderRadius: 22, padding: 20, backgroundColor: p.cardWhite, gap: 6 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: p.textMuted }}>
                  Details
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary, lineHeight: 20 }}>
                  {goal.description}
                </Text>
              </View>
            ) : null}

            {isManualUnit && !goal.completed ? (
              <View style={{ borderRadius: 22, padding: 20, backgroundColor: p.cardWhite, gap: 12 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: p.textMuted }}>
                  Log progress
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    value={logValue}
                    onChangeText={setLogValue}
                    keyboardType="numeric"
                    placeholder={`Add ${unitLabel}`}
                    placeholderTextColor={p.textMuted}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: p.inputBg,
                      color: p.textPrimary,
                      fontFamily: "Outfit-Bold",
                      fontSize: 15,
                    }}
                  />
                  <Pressable
                    onPress={handleLogProgress}
                    disabled={logProgress.isPending || !logValue}
                    style={{
                      borderRadius: 14,
                      paddingHorizontal: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: p.accent,
                      opacity: logProgress.isPending || !logValue ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: isDark ? p.textPrimary : "#fff" }}>Add</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

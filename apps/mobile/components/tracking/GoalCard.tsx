import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CheckCircle } from "lucide-react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import type { TrackingGoal } from "@/hooks/goals/useMyGoals";

const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function GoalCard({ goal, index }: { goal: TrackingGoal; index: number }) {
  const { isDark } = useAppTheme();
  const p = useAdminPastel();
  const BENTO_BORDER = { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" } as const;

  const unitLabel = goal.unit === "custom" ? (goal.customUnit ?? "") : goal.unit;
  const dueLabel = goal.endDate
    ? `Ends ${new Date(goal.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    : null;

  const done = goal.completed;
  const pct = goal.percentage / 100;
  const barColor = p.accent;
  const ringTrackColor = done ? "rgba(46,125,50,0.15)" : p.accentSoft;
  const ringOffset = RING_CIRCUMFERENCE * (1 - pct);

  const progressLabel = `${goal.progressValue.toFixed(1)} / ${goal.targetValue} ${unitLabel}`;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(280)}
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
              r={RING_RADIUS}
              stroke={ringTrackColor}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={barColor}
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
            {done ? (
              <CheckCircle size={20} color={p.accent} />
            ) : (
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: barColor, letterSpacing: -0.3 }}>
                {Math.round(pct * 100)}%
              </Text>
            )}
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

      {!done && (
        <View style={{ gap: 5 }}>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: p.accentSoft, overflow: "hidden" }}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: barColor, width: `${Math.min(100, pct * 100)}%` }} />
          </View>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>{progressLabel}</Text>
        </View>
      )}
    </Animated.View>
  );
}

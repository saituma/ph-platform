import React from "react";
import { ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

export type TrainingAchievement = {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type TrainingStats = {
  exerciseCompletions: number;
  sessionRuns: number;
  trainingDays: number;
};

export function AchievementsStrip({
  stats,
  achievements,
}: {
  stats: TrainingStats;
  achievements: TrainingAchievement[];
}) {
  const { colors, isDark } = useAppTheme();
  const unlocked = achievements.filter((a) => a.unlocked);
  const surface = isDark ? colors.cardElevated : "#F7FFF9";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

  return (
    <View
      className="rounded-[24px] border px-4 py-4 gap-3"
      style={{
        backgroundColor: surface,
        borderColor: border,
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <View className="flex-row items-center gap-2">
        <Feather name="award" size={18} color={colors.accent} />
        <Text className="text-sm font-clash font-bold text-app">Progress & achievements</Text>
      </View>
      <Text className="text-xs font-outfit text-secondary leading-5">
        {stats.exerciseCompletions} exercise check-ins · {stats.sessionRuns} full sessions logged ·{" "}
        {stats.trainingDays} active days
      </Text>
      {unlocked.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {unlocked.map((a) => (
            <View
              key={a.key}
              className="rounded-full px-3 py-2 flex-row items-center gap-1.5"
              style={{ backgroundColor: `${colors.accent}22` }}
            >
              <Feather name="check-circle" size={14} color={colors.accent} />
              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.accent }}>
                {a.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text className="text-xs font-outfit text-secondary">
          Finish a session in the runner or log an exercise to earn your first badge.
        </Text>
      )}
    </View>
  );
}

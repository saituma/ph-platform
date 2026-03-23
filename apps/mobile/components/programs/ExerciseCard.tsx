import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ExerciseItem } from "@/constants/program-details";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export function ExerciseCard({
  exercise,
  onVideoPress,
}: {
  exercise: ExerciseItem;
  onVideoPress?: (url: string) => void;
}) {
  const { colors, isDark } = useAppTheme();
  
  return (
    <View 
      className="rounded-[24px] border px-5 py-4"
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.06)",
      }}
    >
      <Text className="text-[17px] font-clash font-bold mb-2.5" style={{ color: colors.text }}>{exercise.name}</Text>
      
      <View className="flex-row flex-wrap gap-2">
        {exercise.sets ? (
          <View className="rounded-md px-2 py-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }}>
            <Text className="text-[11px] font-outfit font-medium" style={{ color: colors.textSecondary }}>{exercise.sets} sets</Text>
          </View>
        ) : null}
        {exercise.reps ? (
          <View className="rounded-md px-2 py-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }}>
            <Text className="text-[11px] font-outfit font-medium" style={{ color: colors.textSecondary }}>{exercise.reps} reps</Text>
          </View>
        ) : null}
        {exercise.time ? (
          <View className="rounded-md px-2 py-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }}>
            <Text className="text-[11px] font-outfit font-medium" style={{ color: colors.textSecondary }}>{exercise.time}</Text>
          </View>
        ) : null}
        {exercise.rest ? (
          <View className="rounded-md px-2 py-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }}>
            <Text className="text-[11px] font-outfit font-medium" style={{ color: colors.textSecondary }}>{exercise.rest} rest</Text>
          </View>
        ) : null}
      </View>
      
      {exercise.notes ? (
        <Text className="text-[14px] font-outfit mt-3 leading-[22px]" style={{ color: colors.text }}>{exercise.notes}</Text>
      ) : null}
      
      {(exercise.progressions || exercise.regressions) ? (
        <View className="mt-4 gap-2 pt-4 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" }}>
          {exercise.progressions ? (
            <View className="flex-row items-start gap-2">
              <Feather name="trending-up" size={14} color="#10B981" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-[10px] font-outfit uppercase tracking-[1px] font-bold mb-0.5" style={{ color: "#10B981" }}>Progression</Text>
                <Text className="text-[13px] font-outfit" style={{ color: colors.textSecondary }}>{exercise.progressions}</Text>
              </View>
            </View>
          ) : null}
          {exercise.regressions ? (
            <View className="flex-row items-start gap-2 mt-1">
              <Feather name="trending-down" size={14} color="#F59E0B" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-[10px] font-outfit uppercase tracking-[1px] font-bold mb-0.5" style={{ color: "#F59E0B" }}>Regression</Text>
                <Text className="text-[13px] font-outfit" style={{ color: colors.textSecondary }}>{exercise.regressions}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {exercise.videoUrl ? (
        <TouchableOpacity
          onPress={() => onVideoPress?.(exercise.videoUrl!)}
          className="mt-4 rounded-xl py-3 flex-row items-center justify-center gap-2"
          style={{ backgroundColor: colors.accent }}
        >
          <Feather name="play-circle" size={16} color="white" />
          <Text className="text-[13px] font-outfit font-bold text-white">Watch demo</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
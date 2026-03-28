import React from "react";
import { Pressable, View } from "react-native";

import { ExerciseItem } from "@/constants/program-details";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export function ExerciseCard({
  exercise,
  onPress,
}: {
  exercise: ExerciseItem;
  onVideoPress?: (url: string) => void;
  onPress?: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const isNavigable = typeof onPress === "function";

  return (
    <View
      className="rounded-[24px] border px-5 py-4"
      style={{
        backgroundColor: colors.card,
        borderColor: exercise.completed
          ? isDark
            ? "rgba(34,197,94,0.28)"
            : "rgba(34,197,94,0.22)"
          : isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(15,23,42,0.06)",
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-2">
          <Text className="text-[17px] font-clash font-bold" style={{ color: colors.text }}>
            {exercise.name}
          </Text>
          <View
            className="self-start rounded-full px-3 py-1.5"
            style={{
              backgroundColor: exercise.completed
                ? isDark
                  ? "rgba(34,197,94,0.18)"
                  : "#ECFDF5"
                : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "#F8FAFC",
            }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold uppercase tracking-[1px]"
              style={{ color: exercise.completed ? colors.accent : colors.textSecondary }}
            >
              {exercise.completed ? "Completed" : "Not completed"}
            </Text>
          </View>
        </View>
        {isNavigable ? (
          <Pressable
            onPress={onPress}
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: colors.accent }}
          >
            <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px] text-white">
              View Detail
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

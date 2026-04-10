import React from "react";
import { View } from "react-native";

import { ExerciseItem } from "@/constants/program-details";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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

  const borderColor = exercise.completed
    ? isDark
      ? "rgba(34,197,94,0.28)"
      : "rgba(34,197,94,0.22)"
    : colors.border;

  return (
    <Card
      padding={16}
      radius="xl"
      style={{
        borderWidth: 1,
        borderColor,
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
        {isNavigable && (
          <Button
            label="View Detail"
            onPress={onPress}
            size="sm"
            fullWidth={false}
            radius="pill"
            textStyle={{ fontSize: 12, fontFamily: "Outfit-Bold" }}
          />
        )}
      </View>
    </Card>
  );
}

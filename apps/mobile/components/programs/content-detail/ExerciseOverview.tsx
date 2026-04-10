import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { ExerciseMetadata } from "../../../hooks/programs/useContentDetail";

interface ExerciseOverviewProps {
  isExerciseDetail: boolean;
  hasExercise: boolean;
  meta: ExerciseMetadata;
  contentBody: React.ReactNode;
  canLogCompletion: boolean;
  onMarkComplete: () => void;
  colors: any;
  isDark: boolean;
  surfaceColor: string;
  mutedSurface: string;
  accentSurface: string;
}

export function ExerciseOverview({
  isExerciseDetail,
  hasExercise,
  meta,
  contentBody,
  canLogCompletion,
  onMarkComplete,
  colors,
  isDark,
  surfaceColor,
  mutedSurface,
  accentSurface,
}: ExerciseOverviewProps) {
  return (
    <View
      className="rounded-[28px] px-6 py-6 gap-4"
      style={{
        backgroundColor: surfaceColor,
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <Text className="text-2xl font-clash text-app font-bold">
        {isExerciseDetail ? "Exercise overview" : "Overview"}
      </Text>

      {hasExercise && (
        <View className="flex-row flex-wrap gap-2">
          {meta.sets != null && (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: accentSurface }}
            >
              <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>
                {meta.sets} sets
              </Text>
            </View>
          )}
          {meta.reps != null && (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: accentSurface }}
            >
              <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>
                {meta.reps} reps
              </Text>
            </View>
          )}
          {meta.duration != null && (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: accentSurface }}
            >
              <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>
                {meta.duration}s duration
              </Text>
            </View>
          )}
          {meta.restSeconds != null && (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: accentSurface }}
            >
              <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>
                {meta.restSeconds}s rest
              </Text>
            </View>
          )}
          {meta.category && (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: mutedSurface }}
            >
              <Text
                className="text-[11px] font-outfit font-semibold"
                style={{ color: colors.text }}
              >
                {meta.category}
              </Text>
            </View>
          )}
          {meta.equipment && (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: mutedSurface }}
            >
              <Text
                className="text-[11px] font-outfit"
                style={{ color: colors.text }}
              >
                🏋️ {meta.equipment}
              </Text>
            </View>
          )}
        </View>
      )}

      {contentBody}

      {canLogCompletion && (
        <Pressable
          onPress={onMarkComplete}
          className="mt-4 rounded-2xl px-4 py-4 flex-row items-center justify-center gap-2"
          style={{ backgroundColor: colors.accent }}
        >
          <Feather name="check-circle" size={18} color="#ffffff" />
          <Text className="text-white font-outfit font-bold text-sm uppercase tracking-[1.3px]">
            {isExerciseDetail ? "Mark exercise complete" : "Mark as Complete"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

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
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const Metric = ({ label, value }: { label: string; value: string }) => (
    <View
      className="rounded-full border px-4 py-3 flex-row items-center gap-3"
      style={{
        backgroundColor: mutedSurface,
        borderColor: borderSoft,
      }}
    >
      <Text
        className="text-[11px] font-outfit uppercase tracking-[1.2px] font-bold"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </Text>
      <View className="flex-1" />
      <Text
        className="text-[14px] font-clash font-bold"
        style={{ color: colors.text }}
      >
        {value}
      </Text>
    </View>
  );

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
        <View className="flex-row flex-wrap gap-3">
          {meta.sets != null ? (
            <View style={{ flexBasis: "48%" }}>
              <Metric label="Sets" value={String(meta.sets)} />
            </View>
          ) : null}
          {meta.reps != null ? (
            <View style={{ flexBasis: "48%" }}>
              <Metric label="Reps" value={String(meta.reps)} />
            </View>
          ) : null}
          {meta.duration != null ? (
            <View style={{ flexBasis: "48%" }}>
              <Metric label="Duration" value={`${meta.duration}s`} />
            </View>
          ) : null}
          {meta.restSeconds != null ? (
            <View style={{ flexBasis: "48%" }}>
              <Metric label="Rest" value={`${meta.restSeconds}s`} />
            </View>
          ) : null}
          {meta.category ? (
            <View style={{ flexBasis: "48%" }}>
              <Metric label="Category" value={String(meta.category)} />
            </View>
          ) : null}
          {meta.equipment ? (
            <View style={{ flexBasis: "48%" }}>
              <Metric label="Equipment" value={String(meta.equipment)} />
            </View>
          ) : null}
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

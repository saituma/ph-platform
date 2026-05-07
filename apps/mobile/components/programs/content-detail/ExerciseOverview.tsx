import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { ExerciseMetadata } from "../../../hooks/programs/useContentDetail";
import { ProgramMetricGrid } from "@/components/programs/metrics/ProgramMetricGrid";
import { useAdminPastel } from "@/components/admin/AdminUI";

interface ExerciseOverviewProps {
  isExerciseDetail: boolean;
  hasExercise: boolean;
  meta: ExerciseMetadata;
  contentBody: React.ReactNode;
  canLogCompletion: boolean;
  onMarkComplete: () => void;
}

export function ExerciseOverview({
  isExerciseDetail,
  hasExercise,
  meta,
  contentBody,
  canLogCompletion,
  onMarkComplete,
}: ExerciseOverviewProps) {
  const p = useAdminPastel();

  return (
    <View
      className="rounded-[28px] px-6 py-6 gap-4"
      style={{
        backgroundColor: p.cardWhite,
        ...Shadows.sm,
      }}
    >
      <Text className="text-2xl font-clash text-app font-bold">
        {isExerciseDetail ? "Exercise overview" : "Overview"}
      </Text>

      {hasExercise && (
        <ProgramMetricGrid
          items={[
            meta.sets != null
              ? {
                  key: "sets",
                  label: "Sets",
                  value: String(meta.sets),
                  icon: "hash",
                  accent: true,
                }
              : null,
            meta.reps != null
              ? {
                  key: "reps",
                  label: "Reps",
                  value: String(meta.reps),
                  icon: "repeat",
                }
              : null,
            meta.duration != null
              ? {
                  key: "duration",
                  label: "Duration",
                  value: String(meta.duration),
                  unit: "s",
                  icon: "clock",
                }
              : null,
            meta.restSeconds != null
              ? {
                  key: "rest",
                  label: "Rest",
                  value: String(meta.restSeconds),
                  unit: "s",
                  icon: "pause-circle",
                }
              : null,
            meta.category
              ? {
                  key: "category",
                  label: "Category",
                  value: String(meta.category),
                  icon: "tag",
                  valueKind: "text" as const,
                }
              : null,
            meta.equipment
              ? {
                  key: "equipment",
                  label: "Equipment",
                  value: String(meta.equipment),
                  icon: "tool",
                  valueKind: "text" as const,
                }
              : null,
          ].filter(Boolean) as any}
        />
      )}

      {contentBody}

      {canLogCompletion && (
        <Pressable
          onPress={onMarkComplete}
          className="mt-4 rounded-2xl px-4 py-4 flex-row items-center justify-center gap-2"
          style={{ backgroundColor: p.accent }}
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

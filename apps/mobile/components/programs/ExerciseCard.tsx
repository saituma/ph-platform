import React from "react";
import { View } from "react-native";

import { ExerciseItem } from "@/constants/program-details";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Card } from "@/components/ui/legacy-card";
import { Button } from "@/components/ui/legacy-button";

export function ExerciseCard({
  exercise,
  onPress,
}: {
  exercise: ExerciseItem;
  onVideoPress?: (url: string) => void;
  onPress?: () => void;
}) {
  const p = useAdminPastel();
  const isNavigable = typeof onPress === "function";

  const borderColor = exercise.completed ? p.success : p.divider;

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
          <Text className="text-[17px] font-clash font-bold" style={{ color: p.textPrimary }}>
            {exercise.name}
          </Text>
          <View
            className="self-start rounded-full px-3 py-1.5"
            style={{
              backgroundColor: exercise.completed ? p.successSoft : p.cardSage,
            }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold uppercase tracking-[1px]"
              style={{ color: exercise.completed ? p.accent : p.textSecondary }}
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

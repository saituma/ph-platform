import React from "react";
import { View, Pressable, Text } from "react-native";
import { Shadows } from "@/constants/theme";

interface NavigationFooterProps {
  previousExerciseId: string | null;
  nextExerciseId: string | null;
  onPrevious: () => void;
  onNext: () => void;
  colors: any;
  isDark: boolean;
  surfaceColor: string;
  mutedSurface: string;
  borderSoft: string;
}

export function NavigationFooter({
  previousExerciseId,
  nextExerciseId,
  onPrevious,
  onNext,
  colors,
  isDark,
  surfaceColor,
  mutedSurface,
  borderSoft,
}: NavigationFooterProps) {
  return (
    <View
      className="absolute left-6 right-6 flex-row items-center gap-3 rounded-[28px] border px-4 py-4"
      style={{
        bottom: 20,
        backgroundColor: surfaceColor,
        borderColor: borderSoft,
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <Pressable
        onPress={onPrevious}
        disabled={!previousExerciseId}
        className={`flex-1 rounded-2xl px-4 py-4 items-center justify-center ${
          previousExerciseId ? "" : "opacity-50"
        }`}
        style={{ backgroundColor: mutedSurface }}
      >
        <Text
          className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px]"
          style={{ color: colors.text }}
        >
          Previous
        </Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        className="flex-1 rounded-2xl px-4 py-4 items-center justify-center"
        style={{ backgroundColor: colors.accent }}
      >
        <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px] text-white">
          {nextExerciseId ? "Next" : "Finish Session"}
        </Text>
      </Pressable>
    </View>
  );
}

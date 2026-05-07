import React from "react";
import { View, Pressable, Text } from "react-native";
import { Shadows } from "@/constants/theme";
import { useAdminPastel } from "@/components/admin/AdminUI";

interface NavigationFooterProps {
  previousExerciseId: string | null;
  nextExerciseId: string | null;
  onPrevious: () => void;
  onNext: () => void;
}

export function NavigationFooter({
  previousExerciseId,
  nextExerciseId,
  onPrevious,
  onNext,
}: NavigationFooterProps) {
  const p = useAdminPastel();

  return (
    <View
      className="absolute left-6 right-6 flex-row items-center gap-3 rounded-[28px] border px-4 py-4"
      style={{
        bottom: 20,
        backgroundColor: p.cardWhite,
        borderColor: p.divider,
        ...Shadows.md,
      }}
    >
      <Pressable
        onPress={onPrevious}
        disabled={!previousExerciseId}
        className={`flex-1 rounded-2xl px-4 py-4 items-center justify-center ${
          previousExerciseId ? "" : "opacity-50"
        }`}
        style={{ backgroundColor: p.inputBg }}
      >
        <Text
          className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px]"
          style={{ color: p.textPrimary }}
        >
          Previous
        </Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        className="flex-1 rounded-2xl px-4 py-4 items-center justify-center"
        style={{ backgroundColor: p.accent }}
      >
        <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.1px] text-white">
          {nextExerciseId ? "Next" : "Finish Session"}
        </Text>
      </Pressable>
    </View>
  );
}

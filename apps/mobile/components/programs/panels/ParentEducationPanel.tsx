import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "@/components/ScaledText";
import { ProgramPanelCard } from "./shared/ProgramPanelCard";

export function ParentEducationPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <ProgramPanelCard>
      <Text className="text-lg font-clash text-app font-bold mb-2">Parent Education Hub</Text>
      <Text className="text-sm font-outfit text-secondary leading-relaxed">
        Explore curated courses on growth, recovery, nutrition, and mindset.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Open Parent Education</Text>
      </TouchableOpacity>
    </ProgramPanelCard>
  );
}

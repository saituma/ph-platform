import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "@/components/ScaledText";
import { ProgramPanelCard } from "./shared/ProgramPanelCard";

export function BookingsPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <ProgramPanelCard>
      <Text className="text-lg font-clash text-app font-bold mb-2">Bookings</Text>
      <Text className="text-sm font-outfit text-secondary leading-relaxed">
        Book one-to-one sessions, lift lab visits, or role model meetings.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Go to Bookings</Text>
      </TouchableOpacity>
    </ProgramPanelCard>
  );
}

import React from "react";
import { View } from "react-native";

import { Text } from "@/components/ScaledText";

export function AgeGate({
  title = "Not available",
  message = "This section is not available for this age.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-2xl font-clash text-app text-center mb-2">{title}</Text>
      <Text className="text-base font-outfit text-secondary text-center">{message}</Text>
    </View>
  );
}

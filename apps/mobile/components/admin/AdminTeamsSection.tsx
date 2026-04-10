import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { SmallAction } from "./AdminShared";
import { useRouter } from "expo-router";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";

export function AdminTeamsSection() {
  const router = useRouter();

  return (
    <View className="gap-4">
      <View className="gap-3">
        <Text className="text-[13px] font-outfit-semibold text-app">Manage teams</Text>
        <View className="flex-row gap-2">
          <SmallAction
            label="Open teams"
            tone="success"
            onPress={() => router.push("/admin-teams")}
          />
          <SmallAction
            label="Post training"
            tone="neutral"
            onPress={() => requestGlobalTabChange(5)}
          />
        </View>
        <Text className="text-[12px] font-outfit text-secondary">
          Create teams, assign athletes, and move athletes (with MOVE confirmation).
        </Text>
      </View>
    </View>
  );
}

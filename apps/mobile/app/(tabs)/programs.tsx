import { ProgramCard } from "@/components/ProgramCard";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { PROGRAM_TIERS } from "@/constants/Programs";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgramsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="mb-8">
          <Text className="text-4xl font-clash text-app mb-2">Programs</Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Choose the level of coaching that fits your athlete's goals.
          </Text>
        </View>

        {PROGRAM_TIERS.map((tier, index) => (
          <ProgramCard key={tier.id} tier={tier} index={index} />
        ))}
      </ThemedScrollView>
    </SafeAreaView>
  );
}

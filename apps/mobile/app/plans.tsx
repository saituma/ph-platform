import { ProgramCard } from "@/components/ProgramCard";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlansScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/more")}
          className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
        >
          <Feather name="arrow-left" size={20} className="text-app" />
        </TouchableOpacity>
        <Text className="text-xl font-clash text-app font-bold">
          Subscription Plan
        </Text>
        <View className="w-10" />
      </View>

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
          <Text className="text-3xl font-clash text-app mb-2">
            Choose Your Plan
          </Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Select the best coaching tier for your athlete's development and
            goals.
          </Text>
        </View>

        {PROGRAM_TIERS.map((tier, index) => (
          <ProgramCard key={tier.id} tier={tier} index={index} />
        ))}
      </ThemedScrollView>
    </SafeAreaView>
  );
}

import { ActionButton } from "@/components/dashboard/ActionButton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
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
        <Text className="text-xl font-clash text-app font-bold">About App</Text>
        <View className="w-10" />
      </View>

      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-accent rounded-[32px] items-center justify-center shadow-lg shadow-accent/40 mb-6">
            <Feather name="activity" size={48} color="white" />
          </View>
          <Text className="text-4xl font-clash text-app tracking-tighter">
            PHP Coaching
          </Text>
          <Text className="text-base font-outfit text-secondary mt-1">
            Version 1.0.0 (Build 124)
          </Text>
        </View>

        <View className="bg-input rounded-[32px] p-8 border border-app shadow-sm mb-8">
          <Text className="text-lg font-bold font-clash text-app mb-4">
            Our Mission
          </Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed mb-6">
            Providing professional-grade football coaching and athletic
            development to young athletes, supported by science and elite
            experience.
          </Text>

          <Text className="text-lg font-bold font-clash text-app mb-4">
            The Platform
          </Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Built by coaches and developers at Lift Lab to bridge the gap
            between amateur play and professional pathways.
          </Text>
        </View>

        <View className="flex-row justify-center gap-6 mb-10">
          <SocialIcon icon="instagram" />
          <SocialIcon icon="twitter" />
          <SocialIcon icon="globe" />
        </View>

        <ActionButton
          label="Visit Website"
          onPress={() => {}}
          color="bg-secondary"
          icon="external-link"
          fullWidth={true}
        />

        <Text className="text-center text-secondary font-outfit text-[10px] mt-8 uppercase tracking-[3px]">
          © 2026 LIFT LAB LTD. ALL RIGHTS RESERVED.
        </Text>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function SocialIcon({ icon }: { icon: any }) {
  return (
    <TouchableOpacity className="h-14 w-14 bg-input border border-app rounded-full items-center justify-center shadow-sm">
      <Feather name={icon} size={24} className="text-app" />
    </TouchableOpacity>
  );
}

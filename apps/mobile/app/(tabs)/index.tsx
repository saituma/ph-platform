import { AthleteDashboard } from "@/components/dashboard/AthleteDashboard";
import { GuardianDashboard } from "@/components/dashboard/GuardianDashboard";
import { CoachSection } from "@/components/home/CoachSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useRole } from "@/context/RoleContext";
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { role } = useRole();
  const insets = useSafeAreaInsets();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View className="flex-row justify-between items-center mb-10">
        <Animated.View
          entering={FadeInDown.duration(600).springify()}
          className="flex-1"
        >
          <Text className="font-clash text-4xl text-app leading-[1.1]">
            {greeting},{"\n"}
            <Text className="text-accent">
              {role === "Guardian" ? "Parent" : "Athlete"}
            </Text>
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          className="h-14 w-14 bg-secondary rounded-[22px] border-2 border-app shadow-lg items-center justify-center relative"
        >
          <Feather name="user" size={24} className="text-app" />
          <View className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 rounded-full border-2 border-app" />
        </Animated.View>
      </View>

      {/* Role-Specific Content Area */}
      {role === "Guardian" ? <GuardianDashboard /> : <AthleteDashboard />}

      {/* Shared Marketing & Trust Sections (Spec Section 5) */}
      <View className="mt-12 gap-12">
        <Animated.View
          entering={FadeInDown.delay(600).duration(600).springify()}
        >
          <CoachSection />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(700).duration(600).springify()}
        >
          <TestimonialsSection />
        </Animated.View>
      </View>
    </ScrollView>
  );
}

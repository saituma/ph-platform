import { AthleteDashboard } from "@/components/dashboard/AthleteDashboard";
import { GuardianDashboard } from "@/components/dashboard/GuardianDashboard";
import { CoachSection } from "@/components/home/CoachSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRole } from "@/context/RoleContext";
import React, { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { role } = useRole();
  const { colors } = useAppTheme();
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
      {/* Hero */}
      <View className="mb-10">
        <View className="relative bg-input border border-app rounded-[32px] p-6 overflow-hidden">
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: colors.accentLight,
              opacity: 0.6,
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -48,
              left: -48,
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: colors.backgroundSecondary,
              opacity: 0.9,
            }}
          />

          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="h-2 w-2 rounded-full bg-success" />
                <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
                  Today
                </Text>
              </View>
              <Text className="font-clash text-4xl text-app leading-[1.05]">
                {greeting},{"\n"}
                <Text className="text-accent">
                  {role === "Guardian" ? "Parent" : "Athlete"}
                </Text>
              </Text>
              <Text className="text-secondary font-outfit text-sm mt-3 max-w-[240px]">
                Focus on consistency. Small wins stack into big progress.
              </Text>
            </View>

            <View className="h-14 w-14 bg-secondary rounded-[22px] border-2 border-app shadow-lg items-center justify-center relative">
              <Feather name="user" size={24} className="text-app" />
              <View className="absolute bottom-0 right-0 h-4 w-4 bg-success rounded-full border-2 border-app" />
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <View
              className="flex-1 rounded-2xl p-4 border"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
                Sessions
              </Text>
              <Text className="text-2xl font-clash text-app mt-1">2</Text>
            </View>
            <View
              className="flex-1 rounded-2xl p-4 border"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
                Streak
              </Text>
              <Text className="text-2xl font-clash text-app mt-1">7d</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bento Quick Actions */}
      <View className="mb-10">
        <View className="flex-row justify-between items-center mb-4 px-1">
          <View className="flex-row items-center gap-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-xl font-bold font-clash text-app">
              Quick Actions
            </Text>
          </View>
          <Text className="text-xs font-outfit text-secondary uppercase tracking-[2px]">
            Bento
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <TouchableOpacity
            activeOpacity={0.9}
            className="w-[48%] bg-input border border-app rounded-3xl p-4 h-28 justify-between"
          >
            <View className="h-10 w-10 bg-secondary rounded-2xl items-center justify-center">
              <Feather name="play-circle" size={20} className="text-app" />
            </View>
            <View>
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[2px]">
                Session
              </Text>
              <Text className="text-lg font-clash text-app">Start Now</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            className="w-[48%] bg-input border border-app rounded-3xl p-4 h-28 justify-between"
          >
            <View className="h-10 w-10 bg-secondary rounded-2xl items-center justify-center">
              <Feather name="calendar" size={20} className="text-app" />
            </View>
            <View>
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[2px]">
                Schedule
              </Text>
              <Text className="text-lg font-clash text-app">View Plan</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            className="w-full bg-input border border-app rounded-3xl p-4 h-20 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 bg-secondary rounded-2xl items-center justify-center">
                <Feather name="message-circle" size={20} className="text-app" />
              </View>
              <View>
                <Text className="text-sm font-outfit text-secondary uppercase tracking-[2px]">
                  Messages
                </Text>
                <Text className="text-lg font-clash text-app">
                  Talk To Coach
                </Text>
              </View>
            </View>
            <Feather name="arrow-right" size={18} className="text-secondary" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Role-Specific Content Area */}
      {role === "Guardian" ? <GuardianDashboard /> : <AthleteDashboard />}

      {/* Shared Marketing & Trust Sections (Spec Section 5) */}
      <View className="mt-12 gap-12">
        <View>
          <CoachSection />
        </View>

        <View>
          <TestimonialsSection />
        </View>
      </View>
    </ScrollView>
  );
}

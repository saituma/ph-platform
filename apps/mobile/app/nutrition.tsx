import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { NutritionPanel } from "@/components/programs/panels/NutritionPanel";
import { canAccessTier } from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export default function NutritionScreen() {
  const router = useRouter();
  const programTier = useAppSelector((state) => state.user.programTier);
  const appRole = useAppSelector((state) => state.user.appRole);
  const { colors, isDark } = useAppTheme();
  
  // Youths in team or PHP generally get standard access, Adult is Premium Plus restricted unless stated otherwise, but let's just make it universally accessible for now as part of "Nutrition Tracking".
  // The system relies on Coach setting targets anyway.
  const canAccessNutrition = true;

  if (!canAccessNutrition) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <MoreStackHeader title="Nutrition" subtitle="Track wellness and intake." />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-outfit text-secondary text-center">
            Nutrition and Wellness is available on Premium plans.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Nutrition & Wellness"
        subtitle="Log your daily data and metrics."
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <View className="px-4 pt-2">
          <NutritionPanel appRole={appRole} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

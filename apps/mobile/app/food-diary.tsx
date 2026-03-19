import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { FoodDiaryPanel } from "@/components/programs/panels/FoodDiaryPanel";
import { canAccessTier } from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export default function FoodDiaryScreen() {
  const router = useRouter();
  const programTier = useAppSelector((state) => state.user.programTier);
  const { colors, isDark } = useAppTheme();
  const canAccessFoodDiary = canAccessTier(programTier ?? null, "PHP_Plus");

  if (!canAccessFoodDiary) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <MoreStackHeader title="Food Diary" subtitle="Submit food diaries for coach feedback." />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-outfit text-secondary text-center">
            Food diary is available on PHP Plus and Premium plans.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Food Diary"
        subtitle="Log meals and submit for coach feedback."
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <View className="px-4 pt-2">
          <FoodDiaryPanel />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

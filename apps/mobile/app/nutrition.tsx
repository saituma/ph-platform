import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { NutritionPanel } from "@/components/programs/panels/NutritionPanel";
import { useAppSelector } from "@/store/hooks";
import React from "react";
import { Platform, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const appRole = useAppSelector((state) => state.user.appRole);
  
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
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 12) + 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraHeight={Platform.OS === "ios" ? 120 : 160}
        extraScrollHeight={Platform.OS === "ios" ? 40 : 96}
        keyboardDismissMode="on-drag"
      >
        <View className="px-4 pt-2">
          <NutritionPanel appRole={appRole} />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

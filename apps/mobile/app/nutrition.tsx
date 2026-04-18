import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { NutritionPanel } from "@/components/programs/panels/NutritionPanel";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { hasPremiumPlanFeatures } from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";

export default function NutritionScreen() {
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { appRole, programTier } = useAppSelector((state) => state.user);
  const canLog = hasPremiumPlanFeatures(programTier);

  if (!canLog) {
    return (
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background }}>
        <MoreStackHeader
          title="Nutrition & Wellness"
          subtitle="Log your daily data and metrics."
        />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-clash font-bold text-app text-center mb-3">Nutrition logging</Text>
          <Text className="text-base font-outfit text-secondary text-center max-w-[280px]">
            This section isn’t available for your account yet.
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/programs")} className="mt-8 rounded-full px-8 py-3 bg-accent">
            <Text className="text-sm font-outfit font-semibold text-white">Open training</Text>
          </Pressable>
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

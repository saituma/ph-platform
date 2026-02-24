import { Skeleton } from "@/components/Skeleton";
import { useRefreshContext } from "@/context/RefreshContext";
import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";

export function GuardianDashboard() {
  const { isLoading } = useRefreshContext();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const programTier = useAppSelector((state) => state.user.programTier);
  const isPremium = programTier === "PHP_Premium";

  return (
    <View className="gap-8">
      {isLoading ? (
        <View className="bg-input p-6 rounded-[28px] shadow-sm border border-app h-24 justify-center">
          <Skeleton width="45%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={14} />
        </View>
      ) : (
        <>
          {/* AI Coach feature removed */}
        </>
      )}
    </View>
  );
}

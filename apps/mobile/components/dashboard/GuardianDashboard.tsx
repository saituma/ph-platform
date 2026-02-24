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
          {isPremium && (
            <Pressable
              onPress={() => router.navigate("/(tabs)/messages" as any)}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? colors.backgroundSecondary : colors.card,
                  borderRadius: 32,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  ...(isDark ? {} : Shadows.md),
                },
              ]}
            >
              <View className="flex-row items-center gap-4">
                <View className="h-14 w-14 rounded-2xl bg-purple-600 items-center justify-center shadow-lg shadow-purple-500/30">
                  <Ionicons name="sparkles" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-[10px] font-outfit text-purple-600 dark:text-purple-400 uppercase tracking-[2px] font-bold">
                      Premium AI Coach
                    </Text>
                  </View>
                  <Text className="font-clash text-xl text-app">
                    Get Instant Coaching Advice
                  </Text>
                  <Text className="text-secondary font-outfit text-sm mt-1">
                    Ask questions about training, performance, and more.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} opacity={0.5} />
              </View>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

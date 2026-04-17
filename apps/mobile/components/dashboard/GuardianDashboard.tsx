import { Skeleton } from "@/components/Skeleton";
import { useRefreshContext } from "@/context/RefreshContext";
import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import Animated, { FadeInDown } from "react-native-reanimated";

const StatItem = ({ label, value, icon, color, isDark }: any) => (
  <View className="flex-1 items-center">
    <View 
      className="h-12 w-12 rounded-2xl items-center justify-center mb-2"
      style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)" }}
    >
      <Feather name={icon} size={20} color={color} />
    </View>
    <Text className="text-lg font-clash font-bold text-app">{value}</Text>
    <Text className="text-[10px] font-outfit text-secondary uppercase tracking-widest">{label}</Text>
  </View>
);

export function GuardianDashboard() {
  const { isLoading } = useRefreshContext();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const { programTier } = useAppSelector((state) => state.user);

  return (
    <View>
      <View className="flex-row items-center gap-2 mb-4">
        <View className="h-1.5 w-1.5 rounded-full bg-accent" />
        <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2px]">Training Metrics</Text>
      </View>

      <View 
        className="rounded-[32px] border p-6"
        style={{
          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.sm),
        }}
      >
        {isLoading ? (
          <View className="flex-row justify-between py-2">
            <Skeleton width={60} height={60} borderRadius={16} />
            <Skeleton width={60} height={60} borderRadius={16} />
            <Skeleton width={60} height={60} borderRadius={16} />
          </View>
        ) : (
          <View className="flex-row justify-between items-center">
            <StatItem 
              label="Sessions" 
              value="12" 
              icon="activity" 
              color={colors.accent} 
              isDark={isDark} 
            />
            <View className="h-8 w-[1px] bg-secondary/10" />
            <StatItem 
              label="Streak" 
              value="5d" 
              icon="zap" 
              color="#F59E0B" 
              isDark={isDark} 
            />
            <View className="h-8 w-[1px] bg-secondary/10" />
            <StatItem 
              label="Focus" 
              value="92%" 
              icon="target" 
              color="#8B5CF6" 
              isDark={isDark} 
            />
          </View>
        )}

        <Pressable 
          onPress={() => router.push("/(tabs)/programs")}
          className="mt-6 pt-5 border-t flex-row items-center justify-between"
          style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)" }}
        >
          <View>
            <Text className="text-xs font-outfit text-secondary">Access</Text>
            <Text className="text-sm font-outfit font-bold text-app mt-0.5">
              {programTier?.replace("PHP_", "") || "Free Starter"}
            </Text>
          </View>
          <View className="h-8 px-3 rounded-full bg-accent/10 items-center justify-center border border-accent/20">
            <Text className="text-[10px] font-outfit font-bold text-accent uppercase">View Progress</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

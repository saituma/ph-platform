import { Skeleton } from "@/components/Skeleton";
import { useRefreshContext } from "@/context/RefreshContext";
import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius, spacing } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";

const StatItem = ({ label, value, icon, color, isDark, colors }: any) => (
  <View
    style={{
      flex: 1,
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      alignItems: "flex-start",
    }}
  >
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)",
        marginBottom: 10,
      }}
    >
      <Feather name={icon} size={16} color={color} />
    </View>
    <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700" }}>{value}</Text>
    <Text style={{ marginTop: 2, color: colors.textSecondary, fontSize: 11 }}>{label}</Text>
  </View>
);

export function GuardianDashboard() {
  const { isLoading } = useRefreshContext();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const { programTier } = useAppSelector((state) => state.user);

  return (
    <View
      style={{
        borderRadius: radius.xxl,
        padding: spacing.xl,
        backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
            WEEKLY SNAPSHOT
          </Text>
          <Text style={{ marginTop: 6, color: colors.textPrimary, fontSize: 24, fontWeight: "700" }}>
            Training overview
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/programs")}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surfaceHigh,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.82 : 1,
          })}
        >
          <Feather name="arrow-right" size={18} color={colors.accent} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xl }}>
          <Skeleton width="31%" height={100} borderRadius={20} />
          <Skeleton width="31%" height={100} borderRadius={20} />
          <Skeleton width="31%" height={100} borderRadius={20} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xl }}>
            <StatItem
              label="Sessions"
              value="12"
              icon="activity"
              color={colors.accent}
              isDark={isDark}
              colors={colors}
            />
            <StatItem
              label="Streak"
              value="5d"
              icon="zap"
              color="#F59E0B"
              isDark={isDark}
              colors={colors}
            />
            <StatItem
              label="Focus"
              value="92%"
              icon="target"
              color="#8B5CF6"
              isDark={isDark}
              colors={colors}
            />
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/programs")}
            style={({ pressed }) => ({
              marginTop: spacing.lg,
              borderRadius: radius.xl,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              backgroundColor: colors.surfaceHigh,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Access</Text>
              <Text style={{ marginTop: 2, color: colors.textPrimary, fontSize: 14, fontWeight: "700" }}>
                {programTier?.replace("PHP_", "") || "Free Starter"}
              </Text>
            </View>
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "700" }}>View progress</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

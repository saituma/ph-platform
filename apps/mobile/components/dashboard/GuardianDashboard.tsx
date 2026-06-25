import { Skeleton } from "@/components/Skeleton";
import { useRefreshContext } from "@/context/RefreshContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius, spacing } from "@/constants/theme";
import { useRouter } from "expo-router";

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
  const { isLoading: contextLoading } = useRefreshContext();
  const { token, programTier } = useAppSelector((state) => state.user);
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["guardian", "athletes"],
    queryFn: async () => {
      const res = await apiRequest<{ guardian: any | null; athletes: any[] }>(
        "/onboarding/athletes",
        { token: token!, suppressStatusCodes: [401] },
      );
      return res;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = contextLoading || queryLoading;
  const athlete = data?.athletes?.[0] ?? null;

  const injuriesCount = useMemo(() => {
    if (!athlete?.injuries) return 0;
    if (Array.isArray(athlete.injuries)) return athlete.injuries.length;
    if (typeof athlete.injuries === "string") return athlete.injuries.trim() ? 1 : 0;
    return 1;
  }, [athlete]);

  const extraResponses = athlete?.extraResponses ?? {};
  const level =
    typeof extraResponses === "object" && extraResponses !== null
      ? (extraResponses.level ?? null)
      : null;

  const trainingDays = athlete?.trainingPerWeek ?? null;

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
      ) : !athlete ? (
        <View
          style={{
            marginTop: spacing.xl,
            borderRadius: radius.xl,
            padding: spacing.lg,
            backgroundColor: colors.surfaceHigh,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No athlete connected</Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xl }}>
            <StatItem
              label="Sessions"
              value={trainingDays !== null ? String(trainingDays) : "—"}
              icon="activity"
              color={colors.accent}
              isDark={isDark}
              colors={colors}
            />
            <StatItem
              label="Level"
              value={level ?? "—"}
              icon="zap"
              color="#F59E0B"
              isDark={isDark}
              colors={colors}
            />
            <StatItem
              label="Injuries"
              value={String(injuriesCount)}
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

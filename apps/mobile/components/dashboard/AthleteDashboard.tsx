import { Feather } from "@/components/ui/theme-icons";
import { useRefreshContext, usePullToRefresh } from "@/context/RefreshContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius, spacing } from "@/constants/theme";
import { useRouter } from "expo-router";

export function AthleteDashboard() {
  const { isLoading, setIsLoading } = useRefreshContext();
  const { token } = useAppSelector((state) => state.user);
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const [athlete, setAthlete] = useState<any | null>(null);
  const birthdayNotified = useRef(false);

  const loadAthlete = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<{ athlete: any | null }>("/onboarding/athletes/me", {
        token,
        suppressStatusCodes: [401],
        skipCache: true,
        forceRefresh: true,
      });
      setAthlete(data.athlete ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("401")) {
        console.warn("Failed to load athlete data", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, token]);

  useEffect(() => {
    loadAthlete();
  }, [loadAthlete]);

  usePullToRefresh(loadAthlete);

  useEffect(() => {
    if (!athlete?.isBirthday || birthdayNotified.current) return;
    birthdayNotified.current = true;
  }, [athlete]);

  const extraResponses = athlete?.extraResponses ?? {};
  const level =
    typeof extraResponses === "object" && extraResponses !== null
      ? extraResponses.level
      : null;
  const injuriesCount = useMemo(() => {
    if (!athlete?.injuries) return 0;
    if (Array.isArray(athlete.injuries)) return athlete.injuries.length;
    if (typeof athlete.injuries === "string") return athlete.injuries.trim() ? 1 : 0;
    return 1;
  }, [athlete]);
  const programTier = athlete?.currentProgramTier ?? "Pending";
  const trainingDays = athlete?.trainingPerWeek ?? 0;
  const athleteName = athlete?.name ?? "Your";
  const heading = athleteName === "Your" ? "This week" : `${athleteName}'s week`;

  return (
    <View style={{ gap: spacing.lg }}>
      {athlete?.isBirthday ? (
        <View
          style={{
            borderRadius: radius.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: colors.accentLight,
          }}
        >
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
            Happy Birthday{athlete?.name ? `, ${athlete.name}` : ""}
          </Text>
        </View>
      ) : null}

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
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
              WEEKLY RUN STATUS
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: colors.textPrimary,
                fontSize: 26,
                fontWeight: "700",
              }}
            >
              {heading}
            </Text>
            <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 14 }}>
              Training rhythm, current plan, and readiness.
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
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <View style={{ height: 80, borderRadius: radius.xl, backgroundColor: colors.surfaceHigh }} />
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1, height: 88, borderRadius: radius.xl, backgroundColor: colors.surfaceHigh }} />
              <View style={{ flex: 1, height: 88, borderRadius: radius.xl, backgroundColor: colors.surfaceHigh }} />
            </View>
          </View>
        ) : (
          <>
            <View
              style={{
                marginTop: spacing.xl,
                borderRadius: radius.xl,
                padding: spacing.lg,
                backgroundColor: colors.surfaceHigh,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
                PRIMARY METRIC
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 8 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 44, fontWeight: "800", lineHeight: 48 }}>
                  {trainingDays}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 6 }}>
                  days / week
                </Text>
              </View>
              <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 13 }}>
                Current target from your training setup.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
              <MetricTile
                title="Plan"
                value={programTier}
                icon="zap"
                colors={colors}
                isDark={isDark}
              />
              <MetricTile
                title="Level"
                value={level ?? "—"}
                icon="target"
                colors={colors}
                isDark={isDark}
              />
              <MetricTile
                title="Injuries"
                value={String(injuriesCount)}
                icon="alert-circle"
                colors={colors}
                isDark={isDark}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function MetricTile({
  title,
  value,
  icon,
  colors,
  isDark,
}: {
  title: string;
  value: string;
  icon: any;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.xl,
        padding: spacing.md,
        backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accentLight,
          marginBottom: 10,
        }}
      >
        <Feather name={icon} size={16} color={colors.accent} />
      </View>
      <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700" }}>
        {value}
      </Text>
      <Text style={{ marginTop: 2, color: colors.textSecondary, fontSize: 11 }}>{title}</Text>
    </View>
  );
}

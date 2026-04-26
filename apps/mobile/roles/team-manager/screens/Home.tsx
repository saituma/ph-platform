import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";

function StatTile({ label, value }: { label: string; value: string }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <Text style={{ fontSize: 28, fontFamily: "ClashDisplay-Bold", color: colors.text }}>
        {value}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontSize: 11,
          fontFamily: "Outfit",
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function QuickActionTile({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, flex: 1 })}
    >
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minHeight: 104,
          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.sm),
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent + "18",
          }}
        >
          <Feather name={icon} size={22} color={colors.accent} />
        </View>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "OutfitBold",
            color: colors.text,
            textAlign: "center",
            letterSpacing: 0.1,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function TeamManagerHomeScreen() {
  const { colors } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { authTeamMembership, managedAthletes } = useAppSelector((state) => state.user);

  const teamName = authTeamMembership?.team ?? managedAthletes[0]?.team ?? "Your Team";
  const memberCount = useMemo(() => managedAthletes.length, [managedAthletes]);
  const youthCount = useMemo(
    () => managedAthletes.filter((a) => a.athleteType === "youth").length,
    [managedAthletes],
  );
  const adultCount = useMemo(
    () => managedAthletes.filter((a) => a.athleteType === "adult").length,
    [managedAthletes],
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}>
        {/* Title section */}
        <View style={{ paddingTop: 40, marginBottom: 28, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <View
              style={{ height: 32, width: 6, borderRadius: 99, backgroundColor: colors.accent }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 44,
                fontFamily: "TelmaBold",
                color: colors.text,
                letterSpacing: -0.5,
              }}
            >
              Team
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{ fontSize: 15, fontFamily: "Outfit", color: colors.textSecondary, lineHeight: 22 }}
          >
            {teamName}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatTile label="Athletes" value={String(memberCount)} />
            <StatTile label="Youth" value={String(youthCount)} />
            <StatTile label="Adults" value={String(adultCount)} />
          </View>

          {/* Quick actions 2×2 grid */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "OutfitBold",
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 2,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <QuickActionTile
                icon="users"
                label="Roster"
                onPress={() => router.push("/team-manager/roster")}
              />
              <QuickActionTile
                icon="message-circle"
                label="Messages"
                onPress={() => router.push("/(tabs)/messages" as any)}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <QuickActionTile
                icon="calendar"
                label="Schedule"
                onPress={() => router.push("/(tabs)/schedule")}
              />
              <QuickActionTile
                icon="map"
                label="Tracking"
                onPress={() => router.push("/(tabs)/tracking/social" as any)}
              />
            </View>
          </View>
        </View>
      </ThemedScrollView>
    </View>
  );
}

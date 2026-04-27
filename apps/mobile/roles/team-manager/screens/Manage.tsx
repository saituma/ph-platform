import React from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants/theme";

export default function TeamManagerManageScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const appRole = useAppSelector((s) => s.user.appRole);

  if (appRole !== "team_manager") return null;

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        backgroundColor: colors.background,
      }}
    >
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}>
        {/* Header */}
        <View style={{ paddingTop: 40, marginBottom: 24, paddingHorizontal: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                height: 32,
                width: 6,
                borderRadius: 99,
                backgroundColor: colors.accent,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 44,
                fontFamily: "TelmaBold",
                color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)",
                letterSpacing: -0.5,
              }}
            >
              Roster
            </Text>
          </View>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Outfit",
              color: labelColor,
              lineHeight: 22,
            }}
          >
            Manage athletes, team settings, and schedules.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          {/* Athletes section */}
          <SectionCard
            title="Athletes"
            cardBg={cardBg}
            cardBorder={cardBorder}
            labelColor={labelColor}
          >
            <ManageRow
              icon="people-outline"
              title="View Roster"
              subtitle="View and edit athlete profiles"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              divider
              onPress={() => router.push("/team-manager/roster")}
            />
            <ManageRow
              icon="person-add-outline"
              title="Add Athlete"
              subtitle="Invite a new athlete to your team"
              isDark={isDark}
              accent={isDark ? "hsl(155,25%,55%)" : "hsl(155,35%,42%)"}
              cardBorder={cardBorder}
              onPress={() => {
                Alert.alert(
                  "Coming Soon",
                  "Athlete invitations will be available in a future update.",
                  [{ text: "OK" }],
                );
              }}
            />
          </SectionCard>

          {/* Team settings section */}
          <SectionCard
            title="Team Settings"
            cardBg={cardBg}
            cardBorder={cardBorder}
            labelColor={labelColor}
          >
            <ManageRow
              icon="shield-checkmark-outline"
              title="Privacy & Visibility"
              subtitle="Control who can see team activity"
              isDark={isDark}
              accent={isDark ? "hsl(270,25%,65%)" : "hsl(270,35%,50%)"}
              cardBorder={cardBorder}
              divider
              onPress={() =>
                router.push("/(tabs)/tracking/team-settings" as any)
              }
            />
            <ManageRow
              icon="megaphone-outline"
              title="Announcements"
              subtitle="Post updates for the team"
              isDark={isDark}
              accent={isDark ? "hsl(30,30%,60%)" : "hsl(30,45%,45%)"}
              cardBorder={cardBorder}
              onPress={() => router.push("/announcements" as any)}
            />
          </SectionCard>

          {/* Schedule section */}
          <SectionCard
            title="Schedule"
            cardBg={cardBg}
            cardBorder={cardBorder}
            labelColor={labelColor}
          >
            <ManageRow
              icon="calendar-outline"
              title="Sessions & Events"
              subtitle="View and manage training sessions"
              isDark={isDark}
              accent={isDark ? "hsl(200,25%,60%)" : "hsl(200,40%,45%)"}
              cardBorder={cardBorder}
              onPress={() => router.push("/(tabs)/schedule")}
            />
          </SectionCard>

          {/* Tracking section */}
          <SectionCard
            title="Tracking & Stats"
            cardBg={cardBg}
            cardBorder={cardBorder}
            labelColor={labelColor}
          >
            <ManageRow
              icon="trophy-outline"
              title="Team Leaderboard"
              subtitle="View rankings and challenges"
              isDark={isDark}
              accent={isDark ? "hsl(40,30%,60%)" : "hsl(40,45%,45%)"}
              cardBorder={cardBorder}
              divider
              onPress={() =>
                router.push("/(tabs)/tracking/social" as any)
              }
            />
            <ManageRow
              icon="analytics-outline"
              title="Athlete Activity"
              subtitle="Monitor athlete runs and stats"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              onPress={() => router.push("/(tabs)/tracking" as any)}
            />
          </SectionCard>
        </View>
      </ThemedScrollView>
    </View>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  cardBg,
  cardBorder,
  labelColor,
}: {
  title: string;
  children: React.ReactNode;
  cardBg: string;
  cardBorder: string;
  labelColor: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: fonts.bodyBold,
          color: labelColor,
          textTransform: "uppercase",
          letterSpacing: 1.0,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          backgroundColor: cardBg,
          borderColor: cardBorder,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ── ManageRow ──────────────────────────────────────────────────────────────

function ManageRow({
  icon,
  title,
  subtitle,
  isDark,
  accent,
  cardBorder,
  divider = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isDark: boolean;
  accent: string;
  cardBorder: string;
  divider?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        backgroundColor: pressed
          ? isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(15,23,42,0.03)"
          : "transparent",
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: cardBorder,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: fonts.bodyBold,
            color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)",
            letterSpacing: -0.1,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: fonts.bodyMedium,
            color: isDark ? "hsl(220,5%,52%)" : "hsl(220,5%,48%)",
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={17}
        color={isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,60%)"}
      />
    </Pressable>
  );
}

import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";

type ManageRowProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Render a divider line below this row */
  divider?: boolean;
};

function ManageRow({ icon, title, subtitle, onPress, divider }: ManageRowProps) {
  const { colors, isDark } = useAppTheme();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent + "18",
              marginRight: 14,
            }}
          >
            <Feather name={icon} size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "OutfitBold",
                color: colors.text,
                letterSpacing: -0.1,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Outfit",
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          </View>
          <Feather
            name="chevron-right"
            size={18}
            color={isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)"}
          />
        </View>
      </Pressable>
      {divider ? (
        <View
          style={{
            height: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
          }}
        />
      ) : null}
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "OutfitBold",
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 0.9,
          marginBottom: 8,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          paddingHorizontal: 16,
          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.md),
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function TeamManagerManageScreen() {
  const { colors } = useAppTheme();
  const insets = useAppSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}>
        {/* Header */}
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
              Manage
            </Text>
          </View>
          <Text
            style={{ fontSize: 15, fontFamily: "Outfit", color: colors.textSecondary, lineHeight: 22 }}
          >
            Team operations, athletes, schedule, and settings.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Athletes section */}
          <SectionCard title="Athletes">
            <ManageRow
              icon="users"
              title="Roster"
              subtitle="View and edit athlete profiles"
              onPress={() => router.push("/team-manager/roster")}
              divider
            />
            <ManageRow
              icon="user-plus"
              title="Add Athlete"
              subtitle="Invite a new athlete to your team"
              onPress={() => {
                /* future: add-athlete flow */
              }}
            />
          </SectionCard>

          {/* Team section */}
          <SectionCard title="Team">
            <ManageRow
              icon="shield"
              title="Privacy Settings"
              subtitle="Control who can see your team's activity"
              onPress={() => router.push("/(tabs)/tracking/team-settings" as any)}
              divider
            />
            <ManageRow
              icon="map-pin"
              title="Tracking Settings"
              subtitle="Manage GPS tracking and location sharing"
              onPress={() => router.push("/(tabs)/tracking/team-settings" as any)}
            />
          </SectionCard>

          {/* Schedule section */}
          <SectionCard title="Schedule">
            <ManageRow
              icon="calendar"
              title="Bookings"
              subtitle="Book and review sessions with the coach"
              onPress={() => router.push("/(tabs)/schedule")}
              divider
            />
            <ManageRow
              icon="tag"
              title="Services"
              subtitle="Browse available training services"
              onPress={() => router.push("/(tabs)/schedule")}
            />
          </SectionCard>
        </View>
      </ThemedScrollView>
    </View>
  );
}

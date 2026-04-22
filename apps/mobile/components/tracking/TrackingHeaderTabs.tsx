import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { radius, fonts, spacing } from "@/constants/theme";
import { Map, Users } from "lucide-react-native";

type ActiveTab = "running" | "team";

export function TrackingHeaderTabs({
  active,
  colors,
  isDark,
  topInset = 0,
  paddingHorizontal = 16,
  showTeamTab = true,
}: {
  active: ActiveTab;
  colors: Record<string, string>;
  isDark: boolean;
  topInset?: number;
  paddingHorizontal?: number;
  showTeamTab?: boolean;
}) {
  const router = useRouter();

  const containerBg = useMemo(
    () => (isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)"),
    [isDark],
  );
  const borderColor = useMemo(
    () => (isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)"),
    [isDark],
  );
  const dividerColor = useMemo(
    () => (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"),
    [isDark],
  );

  const go = (next: ActiveTab) => {
    if (next === active) return;
    router.replace(
      (next === "running" ? "/(tabs)/tracking" : "/(tabs)/tracking/social") as any,
    );
  };

  return (
    <View
      style={{
        width: "100%",
        alignSelf: "stretch",
        paddingTop: topInset,
        paddingHorizontal,
        paddingBottom: spacing.lg,
      }}
    >
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "stretch",
          height: 60,
          padding: 4,
          backgroundColor: containerBg,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor,
          overflow: "hidden",
        }}
      >
        {!showTeamTab ? (
          <TabSegment
            label="Running"
            icon={Map}
            active
            onPress={() => go("running")}
            colors={colors}
            isDark={isDark}
            isFirst
            isLast
          />
        ) : (
          <>
            <TabSegment
              label="Running"
              icon={Map}
              active={active === "running"}
              onPress={() => go("running")}
              colors={colors}
              isDark={isDark}
              isFirst
              isLast={false}
            />
            <View
              style={{
                width: 1,
                backgroundColor: dividerColor,
                marginVertical: 12,
              }}
            />
            <TabSegment
              label="Community"
              icon={Users}
              active={active === "team"}
              onPress={() => go("team")}
              colors={colors}
              isDark={isDark}
              isFirst={false}
              isLast
            />
          </>
        )}
      </View>
    </View>
  );
}

function TabSegment({
  label,
  icon: Icon,
  active,
  onPress,
  colors,
  isDark,
  isFirst,
  isLast,
}: {
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const radiusStyle = useMemo(
    () => ({
      borderTopLeftRadius: isFirst ? radius.lg - 2 : 0,
      borderBottomLeftRadius: isFirst ? radius.lg - 2 : 0,
      borderTopRightRadius: isLast ? radius.lg - 2 : 0,
      borderBottomRightRadius: isLast ? radius.lg - 2 : 0,
    }),
    [isFirst, isLast],
  );

  const accentFill = colors.accent;
  const activeContentColor = "#FFFFFF";
  const inactiveContentColor = isDark ? colors.textPrimary : colors.textSecondary;

  return (
    <View
      style={{
        flex: 1,
        ...radiusStyle,
        overflow: "hidden",
        backgroundColor: active ? accentFill : "transparent",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        onPress={onPress}
        android_ripple={{
          color: active
            ? "rgba(255,255,255,0.2)"
            : isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(15,23,42,0.08)",
        }}
        style={({ pressed }) => [
          StyleSheet.absoluteFillObject,
          {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: spacing.xs,
            opacity: pressed && !active ? 0.8 : 1,
            gap: 8,
          },
        ]}
      >
        <Icon 
          size={20} 
          color={active ? activeContentColor : inactiveContentColor} 
          strokeWidth={active ? 2.5 : 2} 
        />
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={{
            fontFamily: active ? fonts.clashBold : fonts.bodyBold,
            fontSize: active ? 17 : 16,
            lineHeight: 18,
            letterSpacing: active ? 0.3 : 0.1,
            textAlign: "center",
            color: active ? activeContentColor : inactiveContentColor,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

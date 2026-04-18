import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius } from "@/constants/theme";

type Props = {
  colors: Record<string, string>;
  glassBg: string;
  glassBorder: string;
  glassShadow: Record<string, unknown>;
  mainTabBarOverlap: number;
  bottomOffsetFromTabBar: number;
  backgroundTrackingEnabled: boolean;
  onToggleBackgroundTracking: () => void;
  osrmRoutingEnabled: boolean;
  onToggleOsrmRouting: () => void;
};

function Chip({
  active,
  label,
  icon,
  onPress,
  colors,
  glassBg,
  glassBorder,
  glassShadow,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
  colors: Record<string, string>;
  glassBg: string;
  glassBorder: string;
  glassShadow: Record<string, unknown>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: active ? `${colors.lime}22` : glassBg,
        borderWidth: 1,
        borderColor: active ? `${colors.lime}55` : glassBorder,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...glassShadow,
      })}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.lime : colors.textSecondary}
      />
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: active ? colors.textPrimary : colors.textSecondary,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      <Text
        style={{
          fontFamily: fonts.labelCaps,
          fontSize: 10,
          letterSpacing: 1.8,
          color: active ? colors.lime : colors.textSecondary,
        }}
      >
        {active ? "ON" : "OFF"}
      </Text>
    </Pressable>
  );
}

export function RunPrivacyControls({
  colors,
  glassBg,
  glassBorder,
  glassShadow,
  mainTabBarOverlap,
  bottomOffsetFromTabBar,
  backgroundTrackingEnabled,
  onToggleBackgroundTracking,
  osrmRoutingEnabled,
  onToggleOsrmRouting,
}: Props) {
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: mainTabBarOverlap + bottomOffsetFromTabBar,
        flexDirection: "row",
        gap: 10,
        zIndex: 6,
      }}
    >
      <View style={{ flex: 1 }}>
        <Chip
          active={backgroundTrackingEnabled}
          label="Locked phone"
          icon={backgroundTrackingEnabled ? "lock-closed" : "lock-open-outline"}
          onPress={onToggleBackgroundTracking}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Chip
          active={osrmRoutingEnabled}
          label="Suggested route"
          icon={osrmRoutingEnabled ? "navigate" : "navigate-outline"}
          onPress={onToggleOsrmRouting}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
        />
      </View>
    </View>
  );
}


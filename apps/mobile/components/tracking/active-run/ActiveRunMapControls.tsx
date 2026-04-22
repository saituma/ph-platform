import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function ControlButton({
  icon,
  label,
  onPress,
  colors,
  isDark,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
}) {
  const bg = isDark ? "rgba(18,18,18,0.90)" : "rgba(255,255,255,0.92)";
  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      })}
    >
      <Ionicons name={icon as any} size={24} color={colors.textPrimary} />
    </Pressable>
  );
}

export function ActiveRunMapControls({
  colors,
  isDark,
  bottom,
  onOpenLayers,
  onToggle3D,
  onRecenter,
}: {
  colors: Record<string, string>;
  isDark: boolean;
  bottom: number;
  onOpenLayers: () => void;
  onToggle3D: () => void;
  onRecenter: () => void;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 14,
        bottom,
        gap: 12,
        alignItems: "center",
        zIndex: 30,
      }}
    >
      <ControlButton
        icon="layers-outline"
        label="Layers"
        onPress={onOpenLayers}
        colors={colors}
        isDark={isDark}
      />
      <ControlButton
        icon="cube-outline"
        label="3D"
        onPress={onToggle3D}
        colors={colors}
        isDark={isDark}
      />
      <ControlButton
        icon="locate-outline"
        label="Recenter"
        onPress={onRecenter}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

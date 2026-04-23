import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function BaseControlButton({
  label,
  onPress,
  colors,
  isDark,
  children,
}: {
  label: string;
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const bg = isDark ? "rgba(18,18,18,0.92)" : "rgba(255,255,255,0.94)";
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
      {children}
    </Pressable>
  );
}

function LayersButton({
  onPress,
  colors,
  isDark,
}: {
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
}) {
  return (
    <BaseControlButton
      label="Layers"
      onPress={onPress}
      colors={colors}
      isDark={isDark}
    >
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="layers" size={24} color={colors.textPrimary} />
        <View
          style={{
            position: "absolute",
            top: -8,
            right: -12,
            minWidth: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 6,
          }}
        >
          <Text style={{ color: "#111111", fontSize: 13, fontWeight: "700" }}>1</Text>
        </View>
      </View>
    </BaseControlButton>
  );
}

function RecenterButton({
  onPress,
  colors,
  isDark,
}: {
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
}) {
  return (
    <BaseControlButton
      label="Recenter"
      onPress={onPress}
      colors={colors}
      isDark={isDark}
    >
      <Ionicons name="locate" size={27} color={colors.textPrimary} />
    </BaseControlButton>
  );
}

export function ActiveRunMapControls({
  colors,
  isDark,
  bottom,
  onOpenLayers,
  onRecenter,
}: {
  colors: Record<string, string>;
  isDark: boolean;
  bottom: number;
  onOpenLayers: () => void;
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
      <LayersButton onPress={onOpenLayers} colors={colors} isDark={isDark} />
      <RecenterButton onPress={onRecenter} colors={colors} isDark={isDark} />
    </View>
  );
}

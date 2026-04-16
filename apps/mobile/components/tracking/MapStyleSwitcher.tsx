import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import type { TrackingMapStyle } from "./trackingMapLayers";

type Props = {
  value: TrackingMapStyle;
  onChange: (style: TrackingMapStyle) => void;
  colors: Record<string, string>;
  /** Extra bottom offset (e.g. safe area inset). Ignored if `anchorBottom` is set. */
  bottomOffset?: number;
  /** Extra left inset (default 12). */
  left?: number;
  /**
   * Distance from the parent’s bottom to this control’s bottom edge.
   * Use for precise placement (e.g. above the pause row on the active-run map).
   */
  anchorBottom?: number;
};

export function MapStyleSwitcher({
  value,
  onChange,
  colors,
  bottomOffset = 0,
  left = 12,
  anchorBottom,
}: Props) {
  const bottom =
    typeof anchorBottom === "number" ? anchorBottom : 12 + bottomOffset;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          left,
          bottom,
          backgroundColor: colors.surfaceHigh,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Street map"
        onPress={() => onChange("road")}
        style={[
          styles.seg,
          value === "road" && {
            backgroundColor: colors.accent,
          },
        ]}
      >
        <Ionicons
          name="map"
          size={16}
          color={value === "road" ? colors.textInverse : colors.textSecondary}
        />
        <Text
          style={[
            styles.label,
            {
              color: value === "road" ? colors.textInverse : colors.textSecondary,
            },
          ]}
        >
          Map
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Satellite view"
        onPress={() => onChange("satellite")}
        style={[
          styles.seg,
          value === "satellite" && {
            backgroundColor: colors.accent,
          },
        ]}
      >
        <Ionicons
          name="planet-outline"
          size={16}
          color={value === "satellite" ? colors.textInverse : colors.textSecondary}
        />
        <Text
          style={[
            styles.label,
            {
              color:
                value === "satellite" ? colors.textInverse : colors.textSecondary,
            },
          ]}
        >
          Satellite
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 8,
    elevation: 8,
    flexDirection: "row",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    padding: 3,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  seg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});

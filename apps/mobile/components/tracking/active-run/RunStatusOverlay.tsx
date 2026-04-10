import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PulsingDot } from "../PulsingDot";
import { fonts, radius } from "@/constants/theme";

interface RunStatusOverlayProps {
  status: "idle" | "running" | "paused" | "finished" | "stopped";
  goalKm: number | null;
  destination: any;
  colors: any;
  glassBg: string;
  glassBorder: string;
  glassShadow: any;
  insetsTop: number;
}

export function RunStatusOverlay({
  status,
  goalKm,
  destination,
  colors,
  glassBg,
  glassBorder,
  glassShadow,
  insetsTop,
}: RunStatusOverlayProps) {
  return (
    <View
      style={{
        position: "absolute",
        top: insetsTop + 12,
        left: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: glassBg,
          borderColor: glassBorder,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: radius.pill,
          borderWidth: 1,
          ...glassShadow,
        }}
      >
        <PulsingDot
          size={6}
          color={status === "paused" ? colors.coral : colors.lime}
        />
        <Text
          style={{
            fontFamily: fonts.labelCaps,
            fontSize: 10,
            color: status === "paused" ? colors.coral : colors.lime,
            letterSpacing: 2,
            marginLeft: 6,
          }}
        >
          {status === "paused" ? "PAUSED" : "RUNNING"}
        </Text>
        <View
          style={{
            width: 1,
            height: 12,
            marginHorizontal: 10,
            backgroundColor: colors.borderMid,
            opacity: 0.7,
          }}
        />
        <Ionicons name="navigate" size={12} color={colors.cyan} />
        <Text
          style={{
            fontFamily: fonts.labelCaps,
            fontSize: 10,
            color: colors.cyan,
            letterSpacing: 2,
            marginLeft: 6,
          }}
        >
          GPS
        </Text>
      </View>

      <View style={{ marginTop: 8, gap: 6 }}>
        {goalKm && (
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radius.pill,
              backgroundColor: glassBg,
              borderColor: glassBorder,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 12,
                color: colors.textPrimary,
              }}
            >
              Goal: {goalKm.toFixed(1)} km
            </Text>
          </View>
        )}
        {destination && (
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radius.pill,
              backgroundColor: glassBg,
              borderColor: glassBorder,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 12,
                color: colors.textPrimary,
              }}
            >
              Destination set
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

import React from "react";
import { View, Text } from "react-native";
import { fonts, radius } from "@/constants/theme";
import {
  formatDistanceKm,
  formatDurationClock,
} from "../../../lib/tracking/runUtils";

interface RunBottomBarProps {
  elapsedSeconds: number;
  distanceMeters: number;
  colors: any;
  glassBg: string;
  glassBorder: string;
  glassShadow: any;
  insetsBottom: number;
  bottomBarHeight: number;
}

export function RunBottomBar({
  elapsedSeconds,
  distanceMeters,
  colors,
  glassBg,
  glassBorder,
  glassShadow,
  insetsBottom,
  bottomBarHeight,
}: RunBottomBarProps) {
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: insetsBottom + 16,
        height: bottomBarHeight,
        backgroundColor: glassBg,
        borderColor: glassBorder,
        borderWidth: 1,
        borderRadius: radius.xl,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...glassShadow,
      }}
    >
      <View>
        <Text
          style={{
            fontFamily: fonts.labelCaps,
            fontSize: 10,
            color: colors.textSecondary,
            letterSpacing: 2,
          }}
        >
          TIME
        </Text>
        <Text
          style={{
            fontFamily: fonts.statLabel,
            fontSize: 20,
            color: colors.textPrimary,
          }}
        >
          {formatDurationClock(elapsedSeconds)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            fontFamily: fonts.labelCaps,
            fontSize: 10,
            color: colors.textSecondary,
            letterSpacing: 2,
          }}
        >
          DISTANCE
        </Text>
        <Text
          style={{
            fontFamily: fonts.statLabel,
            fontSize: 20,
            color: colors.textPrimary,
          }}
        >
          {distanceMeters === 0 && elapsedSeconds < 2
            ? "--"
            : formatDistanceKm(distanceMeters, 2)}{" "}
          km
        </Text>
      </View>
    </View>
  );
}

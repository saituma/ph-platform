import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PulsingDot } from "../PulsingDot";
import { fonts, radius } from "@/constants/theme";
import { formatDistanceKm } from "../../../lib/tracking/runUtils";
import { haversineDistance } from "../../../lib/haversine";

interface RunStatusOverlayProps {
  status: "idle" | "running" | "paused" | "finished" | "stopped";
  goalKm: number | null;
  destination: { latitude: number; longitude: number } | null;
  /** Live GPS — used for distance-to-destination. */
  lastCoordinate: { latitude: number; longitude: number } | null;
  /** Real tracked distance from GPS (store). */
  distanceMeters: number;
  colors: Record<string, string>;
  glassBg: string;
  glassBorder: string;
  glassShadow: Record<string, unknown>;
  insetsTop: number;
}

export function RunStatusOverlay({
  status,
  goalKm,
  destination,
  lastCoordinate,
  distanceMeters,
  colors,
  glassBg,
  glassBorder,
  glassShadow,
  insetsTop,
}: RunStatusOverlayProps) {
  const goalMeters = goalKm != null ? goalKm * 1000 : null;
  const progressPct =
    goalMeters != null && goalMeters > 0
      ? Math.min(100, Math.round((distanceMeters / goalMeters) * 100))
      : null;

  const straightLineToDestM =
    destination && lastCoordinate
      ? haversineDistance(
          lastCoordinate.latitude,
          lastCoordinate.longitude,
          destination.latitude,
          destination.longitude,
        )
      : null;

  return (
    <View
      style={{
        position: "absolute",
        top: insetsTop + 12,
        left: 16,
        right: 72,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
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
          GPS LIVE
        </Text>
      </View>

      <View style={{ marginTop: 8, gap: 6 }}>
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: radius.lg,
            backgroundColor: glassBg,
            borderColor: glassBorder,
            borderWidth: 1,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.labelCaps,
              fontSize: 9,
              color: colors.textSecondary,
              letterSpacing: 1.5,
            }}
          >
            DISTANCE
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 14,
              color: colors.textPrimary,
              marginTop: 2,
            }}
          >
            {formatDistanceKm(distanceMeters, 2)} km
          </Text>
        </View>

        {goalKm != null && (
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.lg,
              backgroundColor: glassBg,
              borderColor: glassBorder,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 9,
                color: colors.textSecondary,
                letterSpacing: 1.5,
              }}
            >
              GOAL
            </Text>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: colors.textPrimary,
                marginTop: 2,
              }}
            >
              {formatDistanceKm(distanceMeters, 2)} / {goalKm.toFixed(1)} km
              {progressPct != null ? ` · ${progressPct}%` : ""}
            </Text>
          </View>
        )}

        {destination && (
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.lg,
              backgroundColor: glassBg,
              borderColor: glassBorder,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 9,
                color: colors.textSecondary,
                letterSpacing: 1.5,
              }}
            >
              DESTINATION
            </Text>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: colors.textPrimary,
                marginTop: 2,
              }}
            >
              {straightLineToDestM != null
                ? `~${(straightLineToDestM / 1000).toFixed(2)} km away (straight line)`
                : "Set — distance updates with GPS"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

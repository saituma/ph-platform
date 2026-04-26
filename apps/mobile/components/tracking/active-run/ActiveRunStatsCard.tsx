import React, { useMemo } from "react";
import { View } from "react-native";

import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";
import { formatDistanceKm, formatDurationClock } from "@/lib/tracking/runUtils";

function formatPacePerKm(elapsedSeconds: number, distanceMeters: number): string {
  const km = distanceMeters / 1000;
  if (!Number.isFinite(km) || km < 0.02 || elapsedSeconds < 3) return "--:--";
  const secondsPerKm = elapsedSeconds / km;
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "--:--";
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ActiveRunStatsCard({
  elapsedSeconds,
  distanceMeters,
  colors,
  isDark,
}: {
  elapsedSeconds: number;
  distanceMeters: number;
  colors: Record<string, string>;
  isDark: boolean;
}) {
  const pace = useMemo(
    () => formatPacePerKm(elapsedSeconds, distanceMeters),
    [elapsedSeconds, distanceMeters],
  );

  const cardBg = isDark ? "rgba(10,10,10,0.72)" : "rgba(255,255,255,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";
  const dividerColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

  const distanceDisplay =
    distanceMeters === 0 && elapsedSeconds < 2
      ? "0.00"
      : formatDistanceKm(distanceMeters, 2);

  return (
    <View
      style={{
        borderRadius: radius.xl,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 16,
        ...(isDark
          ? {
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }
          : {
              shadowColor: "#000",
              shadowOpacity: 0.14,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 12 },
              elevation: 8,
            }),
      }}
    >
      {/* Hero distance row */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: fonts.heroNumber,
            fontSize: 56,
            color: colors.textPrimary,
            fontVariant: ["tabular-nums"],
            lineHeight: 58,
          }}
        >
          {distanceDisplay}
        </Text>
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 18,
            color: colors.textSecondary,
            marginLeft: 6,
            marginBottom: 8,
          }}
        >
          km
        </Text>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: dividerColor, marginBottom: 12 }} />

      {/* Time + Pace row */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.labelMedium, fontSize: 10, color: colors.textSecondary, letterSpacing: 1, marginBottom: 2 }}>
            TIME
          </Text>
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 22,
              color: colors.textPrimary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatDurationClock(elapsedSeconds)}
          </Text>
        </View>

        <View style={{ width: 1, height: 36, backgroundColor: dividerColor, marginHorizontal: 16 }} />

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.labelMedium, fontSize: 10, color: colors.textSecondary, letterSpacing: 1, marginBottom: 2 }}>
            PACE /KM
          </Text>
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 22,
              color: colors.textPrimary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {pace}
          </Text>
        </View>
      </View>
    </View>
  );
}

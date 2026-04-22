import React, { useMemo } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  const labelColor = colors.textSecondary;
  const valueColor = colors.textPrimary;
  const cardBg = isDark ? "rgba(18,18,18,0.92)" : "rgba(255,255,255,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

  return (
    <View
      style={{
        borderRadius: radius.xl,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        paddingHorizontal: 18,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontFamily: fonts.heading2, fontSize: 18, color: valueColor }}>
          Run
        </Text>
        <Ionicons name="expand-outline" size={18} color={colors.textSecondary} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <StatBlock
          label="Time"
          value={formatDurationClock(elapsedSeconds)}
          colors={{ label: labelColor, value: valueColor }}
          align="left"
        />
        <StatBlock
          label="Split avg. (/km)"
          value={pace}
          colors={{ label: labelColor, value: valueColor }}
          align="center"
        />
        <StatBlock
          label="Distance (km)"
          value={distanceMeters === 0 && elapsedSeconds < 2 ? "--" : formatDistanceKm(distanceMeters, 2)}
          colors={{ label: labelColor, value: valueColor }}
          align="right"
        />
      </View>
    </View>
  );
}

function StatBlock({
  label,
  value,
  colors,
  align,
}: {
  label: string;
  value: string;
  colors: { label: string; value: string };
  align: "left" | "center" | "right";
}) {
  const alignItems =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <View style={{ flex: 1, alignItems }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 30, color: colors.value, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.label, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}


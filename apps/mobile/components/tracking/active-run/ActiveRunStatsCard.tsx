import React, { useMemo } from "react";
import { View, Pressable } from "react-native";

import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import { formatDistanceKm, formatDurationClock } from "@/lib/tracking/runUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRunStore } from "@/store/useRunStore";

function formatPacePerKm(elapsedSeconds: number, distanceMeters: number): string {
  const km = distanceMeters / 1000;
  if (!Number.isFinite(km) || km < 0.02 || elapsedSeconds < 3) return "--·--";
  const secondsPerKm = elapsedSeconds / km;
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "--·--";
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const PANEL_BG = "rgba(18,18,18,0.98)";
const DIVIDER = "rgba(255,255,255,0.14)";
const AMBER = "#EAB308";

const SPORT_LABELS: Record<string, string> = {
  run: "Run",
  trail_run: "Trail Run",
  walk: "Walk",
  hike: "Hike",
  virtual_run: "Virtual Run",
  treadmill: "Treadmill",
  ride: "Ride",
  virtual_ride: "Virtual Ride",
  e_bike: "E-Bike Ride",
  mountain_bike: "Mountain Bike",
  swim: "Swim",
  open_water_swim: "Open Water Swim",
};

export function ActiveRunStatsCard({
  sportName,
  onExpandPress,
  onSportPress,
}: {
  sportName?: string;
  onExpandPress?: () => void;
  onSportPress?: () => void;
}) {
  // Self-subscribe so per-second elapsed/distance updates only re-render this card,
  // not the entire active-run screen.
  const elapsedSeconds = useRunStore((s) => s.elapsedSeconds);
  const distanceMeters = useRunStore((s) => s.distanceMeters);
  const status = useRunStore((s) => s.status);

  const pace = useMemo(
    () => formatPacePerKm(elapsedSeconds, distanceMeters),
    [elapsedSeconds, distanceMeters],
  );

  const distanceDisplay =
    distanceMeters === 0 && elapsedSeconds < 2
      ? "0"
      : formatDistanceKm(distanceMeters, 2);

  const isStopped = status === "paused" || status === "stopped";
  const titleBg = isStopped ? AMBER : PANEL_BG;
  const displaySportLabel = sportName ? (SPORT_LABELS[sportName] ?? sportName) : "Run";
  const titleLabel = isStopped
    ? (status === "paused" ? "Paused" : "Stopped")
    : displaySportLabel;
  const titleColor = isStopped ? "#111" : "#FFF";
  const expandIconColor = isStopped ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.50)";
  const paceLabel = status === "running" ? "Split avg. (/km)" : "Avg pace (/km)";

  return (
    <View style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" }}>
      {/* Title row */}
      <View
        style={{
          backgroundColor: titleBg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
          paddingVertical: 18,
        }}
      >
        <Pressable
          onPress={!isStopped ? onSportPress : undefined}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}
          hitSlop={8}
        >
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 18,
              color: titleColor,
              textAlign: "center",
            }}
          >
            {titleLabel}
          </Text>
          {!isStopped && (
            <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
          )}
        </Pressable>
        <Pressable
          onPress={onExpandPress}
          hitSlop={14}
          style={{ position: "absolute", right: 18 }}
        >
          <Ionicons name="expand-outline" size={22} color={expandIconColor} />
        </Pressable>
      </View>

      {/* 3-column stats row */}
      <View
        style={{
          backgroundColor: PANEL_BG,
          flexDirection: "row",
          paddingVertical: 22,
          paddingHorizontal: 4,
        }}
      >
        {/* Time */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 30,
              color: "#FFF",
              fontVariant: ["tabular-nums"],
              lineHeight: 34,
            }}
          >
            {formatDurationClock(elapsedSeconds)}
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: "rgba(255,255,255,0.42)",
              marginTop: 6,
            }}
          >
            Time
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: DIVIDER, marginVertical: 2 }} />

        {/* Pace */}
        <View style={{ flex: 1.3, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 30,
              color: "#FFF",
              fontVariant: ["tabular-nums"],
              lineHeight: 34,
            }}
          >
            {pace}
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: "rgba(255,255,255,0.42)",
              marginTop: 6,
              textAlign: "center",
            }}
          >
            {paceLabel}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: DIVIDER, marginVertical: 2 }} />

        {/* Distance */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 30,
              color: "#FFF",
              fontVariant: ["tabular-nums"],
              lineHeight: 34,
            }}
          >
            {distanceDisplay}
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: "rgba(255,255,255,0.42)",
              marginTop: 6,
              textAlign: "center",
            }}
          >
            Distance (km)
          </Text>
        </View>
      </View>
    </View>
  );
}

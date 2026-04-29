import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRunStore } from "@/store/useRunStore";

import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import { formatDistanceKm, formatDurationClock } from "@/lib/tracking/runUtils";
import { ActiveRunActionDock } from "./ActiveRunActionDock";

const AMBER = "#EAB308";
const BG = "#1C1C1C";

function computePace(elapsedSeconds: number, distanceMeters: number): string | null {
  const km = distanceMeters / 1000;
  if (!Number.isFinite(km) || km < 0.02 || elapsedSeconds < 3) return null;
  const spk = elapsedSeconds / km;
  if (!Number.isFinite(spk) || spk <= 0) return null;
  const m = Math.floor(spk / 60);
  const s = Math.round(spk % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Visual placeholder matching the reference: dash · dash dash
// with a small dot below the center circle
function PaceVisual({ pace }: { pace: string | null }) {
  if (pace) {
    return (
      <Text
        style={{
          fontFamily: fonts.heroNumber,
          fontSize: 72,
          color: "#FFF",
          fontVariant: ["tabular-nums"],
          lineHeight: 78,
        }}
      >
        {pace}
      </Text>
    );
  }
  // Reference graphic: [──] [●] [──] [──]
  //                          [·]
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 52, height: 8, borderRadius: 4, backgroundColor: "#FFF" }} />
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF" }} />
        <View style={{ width: 38, height: 8, borderRadius: 4, backgroundColor: "#FFF" }} />
        <View style={{ width: 38, height: 8, borderRadius: 4, backgroundColor: "#FFF" }} />
      </View>
      {/* Small dot centered under the large circle.
          Circle left edge = 52 + 10 = 62, center = 62 + 11 = 73, dot half = 7 → left: 66 */}
      <View style={{ position: "absolute", top: 28, left: 66 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF" }} />
      </View>
    </View>
  );
}

export function ActiveRunExpandedView({
  colors,
  onCollapse,
  onPrimaryPress,
  onFinishRun,
  bottomInset,
}: {
  colors: Record<string, string>;
  onCollapse: () => void;
  onPrimaryPress: () => void;
  onFinishRun: () => void;
  bottomInset: number;
}) {
  const insets = useSafeAreaInsets();
  // Self-subscribe — keeps the parent (active-run.tsx) from re-rendering on every tick.
  const elapsedSeconds = useRunStore((s) => s.elapsedSeconds);
  const distanceMeters = useRunStore((s) => s.distanceMeters);
  const status = useRunStore((s) => s.status);

  const pace = useMemo(
    () => computePace(elapsedSeconds, distanceMeters),
    [elapsedSeconds, distanceMeters],
  );

  const distanceDisplay =
    distanceMeters === 0 && elapsedSeconds < 2
      ? "0.00"
      : formatDistanceKm(distanceMeters, 2);

  const isStopped = status === "paused" || status === "stopped";
  const isRunning = status === "running";
  const statusLabel = status === "paused" ? "Paused" : "Stopped";
  const paceLabel = isRunning ? "Split avg. (/km)" : "Avg pace (/km)";

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: BG,
        zIndex: 50,
      }}
    >
      {/* ── Header ── */}
      {isStopped ? (
        // Amber header (paused / stopped)
        <View
          style={{
            backgroundColor: AMBER,
            paddingTop: insets.top + 6,
            paddingBottom: 22,
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.accentBold,
                fontSize: 18,
                color: "#111",
                textAlign: "center",
                flex: 1,
              }}
            >
              {statusLabel}
            </Text>
            <Pressable
              onPress={onCollapse}
              hitSlop={14}
              style={{ position: "absolute", right: 0 }}
            >
              <Ionicons name="contract-outline" size={24} color="rgba(0,0,0,0.55)" />
            </Pressable>
          </View>
          <Text
            style={{
              fontFamily: fonts.heroNumber,
              fontSize: 68,
              color: "#111",
              fontVariant: ["tabular-nums"],
              textAlign: "center",
              lineHeight: 74,
            }}
          >
            {formatDurationClock(elapsedSeconds)}
          </Text>
        </View>
      ) : (
        // Dark header (running)
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 8,
            paddingHorizontal: 20,
          }}
        >
          <View style={{ alignItems: "flex-end", marginBottom: 4 }}>
            <Pressable onPress={onCollapse} hitSlop={14}>
              <Ionicons name="contract-outline" size={24} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>
          <Text
            style={{
              fontFamily: fonts.heroNumber,
              fontSize: 68,
              color: "#FFF",
              fontVariant: ["tabular-nums"],
              textAlign: "center",
              lineHeight: 74,
            }}
          >
            {formatDurationClock(elapsedSeconds)}
          </Text>
        </View>
      )}

      {/* ── Main content ── */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 44,
          paddingHorizontal: 24,
        }}
      >
        {/* Pace */}
        <View style={{ alignItems: "center", gap: 18 }}>
          <PaceVisual pace={pace} />
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {paceLabel}
          </Text>
        </View>

        {/* Distance */}
        <View style={{ alignItems: "center", gap: 10 }}>
          <Text
            style={{
              fontFamily: fonts.heroNumber,
              fontSize: 84,
              color: "#FFF",
              fontVariant: ["tabular-nums"],
              lineHeight: 90,
            }}
          >
            {distanceDisplay}
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Distance (km)
          </Text>
        </View>

        {/* Splits tab bar */}
        <View style={{ width: "100%", alignItems: "center", gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
            <View
              style={{
                flex: 1,
                alignItems: "center",
                paddingBottom: 10,
                borderBottomWidth: 2,
                borderBottomColor: colors.accent,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 14,
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: 1,
                }}
              >
                --·--
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                height: 34,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />
            <View
              style={{
                flex: 1,
                height: 34,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />
          </View>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 14,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Splits (/km)
          </Text>
        </View>
      </View>

      {/* ── Bottom buttons — literally the same component as the regular dock,
            so styling/spacing is guaranteed identical. ── */}
      <ActiveRunActionDock
        status={status}
        colors={colors}
        isDark
        onPrimaryPress={onPrimaryPress}
        onFinishRun={onFinishRun}
        bottomInset={bottomInset}
      />
    </View>
  );
}

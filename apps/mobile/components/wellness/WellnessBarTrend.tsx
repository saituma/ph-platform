import React from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

export type TrendPoint = {
  /** Short axis label, e.g. "M" or "12". */
  label?: string;
  /** null = no entry that day (renders a faint placeholder bar). */
  value: number | null;
};

type WellnessBarTrendProps = {
  title: string;
  points: TrendPoint[];
  /** Top of the scale (e.g. 5 for a 1–5 metric, or peak hours for sleep). */
  max: number;
  color: string;
  /** Right-aligned summary, e.g. "7.2h avg". */
  summary?: string;
  height?: number;
};

/**
 * Lightweight SVG bar trend in the app's react-native-svg idiom (no chart lib).
 * Most recent point on the right; missing days render faint so gaps read as gaps.
 */
export function WellnessBarTrend({ title, points, max, color, summary, height = 64 }: WellnessBarTrendProps) {
  const p = useAdminPastel();
  const safeMax = max > 0 ? max : 1;
  const count = Math.max(points.length, 1);
  const gap = 6;
  const barW = 14;
  const chartW = count * barW + (count - 1) * gap;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>{title}</Text>
        {summary ? (
          <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 12, color: p.textMuted, marginLeft: "auto" }}>
            {summary}
          </Text>
        ) : null}
      </View>
      <Svg width={chartW} height={height}>
        {points.map((pt, idx) => {
          const x = idx * (barW + gap);
          const has = pt.value != null && Number.isFinite(pt.value);
          const ratio = has ? Math.max(0, Math.min(1, (pt.value as number) / safeMax)) : 0;
          const barH = has ? Math.max(3, ratio * height) : Math.max(3, 0.08 * height);
          return (
            <Rect
              key={idx}
              x={x}
              y={height - barH}
              width={barW}
              height={barH}
              rx={5}
              fill={has ? color : p.divider}
              opacity={has ? 1 : 0.5}
            />
          );
        })}
      </Svg>
      {points.some((pt) => pt.label) ? (
        <View style={{ flexDirection: "row", width: chartW }}>
          {points.map((pt, idx) => (
            <Text
              key={idx}
              style={{
                width: barW,
                marginRight: idx < count - 1 ? gap : 0,
                textAlign: "center",
                fontFamily: "Outfit-Regular",
                fontSize: 9,
                color: p.textMuted,
              }}
            >
              {pt.label ?? ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

type CalorieRingProps = {
  size: number;
  strokeWidth: number;
  progress: number;
  totalKcal: number;
  dateLabel: string;
};

export function CalorieRing({
  size,
  strokeWidth,
  progress,
  totalKcal,
  dateLabel,
}: CalorieRingProps) {
  const p = useAdminPastel();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clampedProgress);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={p.accentSoft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={p.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 32, color: p.textPrimary }}>
          {totalKcal}
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>
            {" "}kcal
          </Text>
        </Text>
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 4 }}>
          {dateLabel}
        </Text>
      </View>
    </View>
  );
}

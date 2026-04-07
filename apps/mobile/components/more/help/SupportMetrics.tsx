import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

interface MetricProps {
  title: string;
  value: string;
  caption: string;
}

function SupportMetric({ title, value, caption }: MetricProps) {
  const { colors, isDark } = useAppTheme();
  return (
    <View
      className="flex-1 rounded-[26px] border p-4"
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <Text className="font-outfit text-[11px] font-bold uppercase tracking-[1.2px] text-secondary mb-2">{title}</Text>
      <Text className="font-clash text-xl text-app mb-2">{value}</Text>
      <Text className="font-outfit text-sm text-secondary leading-5">{caption}</Text>
    </View>
  );
}

export function SupportMetrics() {
  return (
    <View className="mb-8 flex-row gap-3">
      <SupportMetric
        title="Best first step"
        value="Send a clear message"
        caption="Include athlete name, device, and what changed."
      />
      <SupportMetric
        title="Typical reply"
        value="Within 1 business day"
        caption="Detailed requests are usually solved faster."
      />
    </View>
  );
}

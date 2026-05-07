import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

interface MetricProps {
  title: string;
  value: string;
  caption: string;
  bg: string;
}

function SupportMetric({ title, value, caption, bg }: MetricProps) {
  const p = useAdminPastel();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 22,
        padding: 16,
        backgroundColor: bg,
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: p.textSecondary,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, marginBottom: 8 }}>
        {value}
      </Text>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 18 }}>
        {caption}
      </Text>
    </View>
  );
}

export function SupportMetrics() {
  const p = useAdminPastel();
  return (
    <View style={{ marginBottom: 24, flexDirection: "row", gap: 12 }}>
      <SupportMetric
        title="Best first step"
        value="Send a clear message"
        caption="Include athlete name, device, and what changed."
        bg={p.cardMint}
      />
      <SupportMetric
        title="Typical reply"
        value="Within 1 business day"
        caption="Detailed requests are usually solved faster."
        bg={p.cardLavender}
      />
    </View>
  );
}

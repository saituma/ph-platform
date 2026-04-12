import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";

export type ProgramMetricItem = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  accent?: boolean;
};

export function ProgramMetricTile({ item }: { item: ProgramMetricItem }) {
  const { colors: rawColors, isDark } = useAppTheme();
  const colors = rawColors as any;

  const borderSoft =
    colors.borderSubtle ??
    (isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)");
  const background = colors.surfaceHigh ?? colors.cardElevated ?? colors.card;

  return (
    <View
      style={{
        flexBasis: "48%",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: borderSoft,
        backgroundColor: background,
        padding: 14,
        paddingLeft: item.accent ? 18 : 14,
        overflow: "hidden",
      }}
    >
      {item.accent ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 3,
            backgroundColor: colors.accent,
            borderTopRightRadius: radius.pill,
            borderBottomRightRadius: radius.pill,
          }}
        />
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {item.icon ? (
          <View
            style={{
              height: 30,
              width: 30,
              borderRadius: radius.lg,
              backgroundColor: colors.accentLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={item.icon} size={14} color={colors.accent} />
          </View>
        ) : null}
        <Text
          style={{
            fontFamily: fonts.labelCaps,
            fontSize: 10,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: colors.textSecondary,
          }}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 8 }}>
        <Text
          style={{
            fontFamily: fonts.statNumber,
            fontSize: 28,
            color: colors.textPrimary ?? colors.text,
            fontVariant: ["tabular-nums"],
          }}
          numberOfLines={1}
        >
          {item.value}
        </Text>
        {item.unit ? (
          <Text
            style={{
              marginLeft: 6,
              fontFamily: fonts.statLabel,
              fontSize: 13,
              color: colors.textSecondary,
            }}
            numberOfLines={1}
          >
            {item.unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ProgramMetricGrid({ items }: { items: ProgramMetricItem[] }) {
  const filtered = items.filter((item) => item.value.trim().length > 0);
  if (filtered.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {filtered.map((item) => (
        <ProgramMetricTile key={item.key} item={item} />
      ))}
    </View>
  );
}

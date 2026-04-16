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
  /**
   * `stat` — large numeric style (sets, reps, time).
   * `text` — readable multiline body for long labels (category, equipment).
   */
  valueKind?: "stat" | "text";
};

function textValueFontSize(len: number) {
  if (len > 280) return 12;
  if (len > 140) return 13;
  return 14;
}

export function ProgramMetricTile({ item }: { item: ProgramMetricItem }) {
  const { colors: rawColors, isDark } = useAppTheme();
  const colors = rawColors as any;

  const borderSoft =
    colors.borderSubtle ??
    (isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)");
  const background = colors.surfaceHigh ?? colors.cardElevated ?? colors.card;

  const isText = item.valueKind === "text";
  const vLen = item.value.trim().length;
  const bodySize = textValueFontSize(vLen);

  return (
    <View
      style={{
        flexGrow: isText ? 1 : 0,
        flexBasis: isText ? "100%" : "48%",
        minWidth: isText ? "100%" : "48%",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: borderSoft,
        backgroundColor: background,
        padding: 14,
        paddingLeft: item.accent && !isText ? 18 : 14,
        overflow: "hidden",
      }}
    >
      {item.accent && !isText ? (
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

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          flexShrink: 1,
        }}
      >
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
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: colors.textSecondary,
            flex: 1,
            flexShrink: 1,
          }}
          numberOfLines={2}
        >
          {item.label}
        </Text>
      </View>

      {isText ? (
        <Text
          style={{
            marginTop: 10,
            fontFamily: fonts.bodyMedium,
            fontSize: bodySize,
            lineHeight: Math.round(bodySize * 1.45),
            color: colors.textPrimary ?? colors.text,
          }}
        >
          {item.value.trim()}
        </Text>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.statNumber,
              fontSize: vLen > 6 ? 22 : 28,
              color: colors.textPrimary ?? colors.text,
              fontVariant: ["tabular-nums"],
              flexShrink: 1,
            }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
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
      )}
    </View>
  );
}

function statSortKey(key: string): number {
  if (key.includes("sets")) return 0;
  if (key.includes("reps")) return 1;
  if (key.includes("duration")) return 2;
  if (key.includes("rest")) return 3;
  return 50;
}

function textSortKey(key: string): number {
  if (key.includes("category")) return 0;
  if (key.includes("equipment")) return 1;
  return 50;
}

export function ProgramMetricGrid({ items }: { items: ProgramMetricItem[] }) {
  const filtered = items.filter((item) => item.value.trim().length > 0);
  if (filtered.length === 0) return null;

  const statItems = filtered
    .filter((i) => i.valueKind !== "text")
    .sort((a, b) => statSortKey(a.key) - statSortKey(b.key));
  const textItems = filtered
    .filter((i) => i.valueKind === "text")
    .sort((a, b) => textSortKey(a.key) - textSortKey(b.key));

  return (
    <View style={{ gap: 10 }}>
      {statItems.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {statItems.map((item) => (
            <ProgramMetricTile key={item.key} item={item} />
          ))}
        </View>
      ) : null}
      {textItems.map((item) => (
        <ProgramMetricTile key={item.key} item={item} />
      ))}
    </View>
  );
}

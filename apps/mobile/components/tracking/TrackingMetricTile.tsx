import React from "react";
import { View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { fonts, radius } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

type IconLibrary = "Ionicons" | "MaterialCommunityIcons";

type Props = {
  iconLibrary: IconLibrary;
  iconName: any;
  iconColor: string;
  accentColor: string;
  value: string;
  valueColor?: string;
  topLabel?: string;
  bottomLabel?: string;
  borderColor?: string;
  backgroundColor?: string;
  iconSize?: number;
  valueSize?: number;
  topLabelColor?: string;
  bottomLabelColor?: string;
  topLabelTracking?: number;
  bottomLabelTracking?: number;
  bottomLabelFontFamily?: string;
  bottomLabelSize?: number;
};

export function TrackingMetricTile({
  iconLibrary,
  iconName,
  iconColor,
  accentColor,
  value,
  valueColor,
  topLabel,
  bottomLabel,
  borderColor,
  backgroundColor,
  iconSize = 20,
  valueSize = 30,
  topLabelColor,
  bottomLabelColor,
  topLabelTracking = 2,
  bottomLabelTracking = 2,
  bottomLabelFontFamily,
  bottomLabelSize = 10,
}: Props) {
  const { colors } = useAppTheme();

  const Icon = iconLibrary === "Ionicons" ? Ionicons : MaterialCommunityIcons;

  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: backgroundColor ?? colors.surface,
        borderColor: borderColor ?? colors.borderSubtle,
        borderWidth: 1,
        borderRadius: radius.xl,
        padding: 20,
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 20,
          bottom: 20,
          width: 3,
          backgroundColor: accentColor,
          borderTopRightRadius: radius.pill,
          borderBottomRightRadius: radius.pill,
        }}
      />

      <Icon name={iconName} size={iconSize} color={iconColor} style={{ marginBottom: 12 }} />

      {topLabel ? (
        <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: topLabelColor ?? colors.textSecondary, letterSpacing: topLabelTracking }}>
          {topLabel}
        </Text>
      ) : null}

      <Text style={{ fontFamily: fonts.statNumber, fontSize: valueSize, color: valueColor ?? colors.textPrimary, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>

      {bottomLabel ? (
        <Text
          style={{
            fontFamily: bottomLabelFontFamily ?? fonts.labelCaps,
            fontSize: bottomLabelSize,
            color: bottomLabelColor ?? colors.textSecondary,
            letterSpacing: bottomLabelTracking,
            marginTop: 4,
          }}
        >
          {bottomLabel}
        </Text>
      ) : null}
    </View>
  );
}

import React from "react";
import { View } from "react-native";
import { fonts, radius } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

interface MetricTileProps {
  iconLibrary: 'Ionicons' | 'MaterialCommunityIcons';
  iconName: any;
  iconColor: string;
  value: string;
  label: string;
  unit?: string;
  accentColor?: string;
}

export const MetricTile = ({ 
  iconLibrary, 
  iconName, 
  iconColor, 
  value, 
  label, 
  unit,
  accentColor 
}: MetricTileProps) => {
  const { colors } = useAppTheme();
  return (
    <View 
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: 16,
        paddingLeft: accentColor ? 19 : 16, // more padding if accent strip is there
      }}
    >
      {/* Left accent strip */}
      {accentColor && (
        <View style={{
          position: 'absolute',
          left: 0,
          top: 16,
          bottom: 16,
          width: 3,
          backgroundColor: accentColor,
          borderTopRightRadius: radius.pill,
          borderBottomRightRadius: radius.pill,
        }} />
      )}

      {/* Icon */}
      <View style={{
        width: 32,
        height: 32,
        borderRadius: radius.md,
        backgroundColor: colors.cardElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
      }}>
        {iconLibrary === 'Ionicons' ? (
          <Ionicons name={iconName} size={18} color={iconColor} />
        ) : (
          <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
        )}
      </View>

      {/* Label */}
      <Text style={{ 
        fontFamily: fonts.labelCaps, 
        fontSize: 11, 
        letterSpacing: 2, 
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        {label}
      </Text>

      {/* Value row */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ 
          fontFamily: fonts.statNumber, 
          fontSize: 28, 
          color: colors.text,
          fontVariant: ['tabular-nums'],
        }}>
          {value}
        </Text>
        {unit && (
          <Text style={{ 
            fontFamily: fonts.statLabel, 
            fontSize: 13, 
            color: colors.textSecondary,
            marginLeft: 4,
          }}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
};

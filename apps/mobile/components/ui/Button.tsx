import React from "react";
import {
  Pressable,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius as radiusPresets } from "@/constants/theme";

export interface ButtonProps {
  label?: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "none";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ComponentProps<typeof Feather>["name"];
  iconPosition?: "left" | "right";
  iconSize?: number;
  iconColor?: string;
  iconGap?: number;
  centerLabel?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  fullWidth?: boolean;
  radius?: keyof typeof radiusPresets | number;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  iconSize,
  iconColor,
  iconGap = 8,
  centerLabel = false,
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
  radius = "md",
  className,
}: ButtonProps) {
  const { colors, isDark } = useAppTheme();

  const getVariantStyles = (): {
    button: ViewStyle;
    text: TextStyle;
    icon: string;
  } => {
    switch (variant) {
      case "primary":
        return {
          button: { backgroundColor: colors.accent },
          text: { color: "#FFFFFF" },
          icon: "#FFFFFF",
        };
      case "secondary":
        return {
          button: { backgroundColor: colors.backgroundSecondary },
          text: { color: colors.text },
          icon: colors.text,
        };
      case "outline":
        return {
          button: {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: { color: colors.text },
          icon: colors.text,
        };
      case "ghost":
        return {
          button: { backgroundColor: "transparent" },
          text: { color: colors.text },
          icon: colors.text,
        };
      case "danger":
        return {
          button: { backgroundColor: colors.danger },
          text: { color: "#FFFFFF" },
          icon: "#FFFFFF",
        };
      case "none":
        return {
          button: {},
          text: {},
          icon: colors.text,
        };
      default:
        return {
          button: { backgroundColor: colors.accent },
          text: { color: "#FFFFFF" },
          icon: "#FFFFFF",
        };
    }
  };

  const getSizeStyles = (): {
    button: ViewStyle;
    text: TextStyle;
    iconSize: number;
  } => {
    switch (size) {
      case "sm":
        return {
          button: { height: 40, paddingHorizontal: 12 },
          text: { fontSize: 13 },
          iconSize: 14,
        };
      case "md":
        return {
          button: { height: 44, paddingHorizontal: 16 },
          text: { fontSize: 14 },
          iconSize: 18,
        };
      case "lg":
        return {
          button: { height: 56, paddingHorizontal: 20 },
          text: { fontSize: 16 },
          iconSize: 20,
        };
      case "xl":
        return {
          button: { height: 64, paddingHorizontal: 24 },
          text: { fontSize: 18 },
          iconSize: 22,
        };
      default:
        return {
          button: { height: 44, paddingHorizontal: 16 },
          text: { fontSize: 14 },
          iconSize: 18,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const resolvedRadius =
    typeof radius === "number" ? radius : radiusPresets[radius];

  const baseButtonStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: resolvedRadius,
    width: fullWidth ? "100%" : "auto",
    opacity: disabled || loading ? 0.6 : 1,
    ...variantStyles.button,
    ...sizeStyles.button,
    ...(isDark ||
    variant === "ghost" ||
    variant === "outline" ||
    variant === "none"
      ? Shadows.none
      : Shadows.md),
  };

  const baseTextStyle: TextStyle = {
    fontFamily: "Outfit-SemiBold",
    textAlign: "center",
    ...variantStyles.text,
    ...sizeStyles.text,
    ...textStyle,
  };

  const resolvedIconColor = iconColor ?? variantStyles.icon;
  const resolvedIconSize = iconSize || sizeStyles.iconSize;
  const iconReserveSpace = resolvedIconSize + iconGap;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className={className}
      style={({ pressed }) => [
        baseButtonStyle,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        style as any,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={resolvedIconColor} />
      ) : centerLabel && label && icon ? (
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {iconPosition === "left" && (
            <Feather
              name={icon}
              size={resolvedIconSize}
              color={resolvedIconColor}
              style={{ position: "absolute", left: 0 }}
            />
          )}
          <Text
            style={[baseTextStyle, { paddingHorizontal: iconReserveSpace }]}
          >
            {label}
          </Text>
          {iconPosition === "right" && (
            <Feather
              name={icon}
              size={resolvedIconSize}
              color={resolvedIconColor}
              style={{ position: "absolute", right: 0 }}
            />
          )}
        </View>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <Feather
              name={icon}
              size={resolvedIconSize}
              color={resolvedIconColor}
              style={{ marginRight: label ? iconGap : 0 }}
            />
          )}
          {label && <Text style={baseTextStyle}>{label}</Text>}
          {icon && iconPosition === "right" && (
            <Feather
              name={icon}
              size={resolvedIconSize}
              color={resolvedIconColor}
              style={{ marginLeft: label ? iconGap : 0 }}
            />
          )}
        </>
      )}
    </Pressable>
  );
}

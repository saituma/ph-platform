import React from "react";
import { HeroUINativeProvider, type HeroUINativeConfig } from "heroui-native";
import {
  Pressable,
  TextInput as RNTextInput,
  View,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { twMerge } from "tailwind-merge";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

type UIButtonProps = PressableProps & {
  className?: string;
  label?: string;
  textClassName?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "danger-soft" | "tertiary";
  isDisabled?: boolean;
};

type UICardProps = ViewProps & {
  className?: string;
  padded?: boolean;
};

type UIChipProps = PressableProps & {
  className?: string;
  label: string;
  textClassName?: string;
  children?: React.ReactNode;
  color?: "accent" | "default" | "success" | "warning" | "danger";
};

type UITextAreaProps = TextInputProps & {
  className?: string;
};

type UISectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  className?: string;
};

type UIEmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

type UISurfaceProps = ViewProps & {
  className?: string;
  elevated?: boolean;
};

type UISkeletonProps = {
  isLoading?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function HeroAppProvider({ children }: { children: React.ReactNode }) {
  const config: HeroUINativeConfig = {
    textProps: {
      allowFontScaling: false,
      maxFontSizeMultiplier: 1.2,
      adjustsFontSizeToFit: false,
    },
    toast: false,
    devInfo: {
      stylingPrinciples: false,
    },
  };

  return <HeroUINativeProvider config={config}>{children}</HeroUINativeProvider>;
}

export function UISurface({
  children,
  className,
  style,
  elevated = false,
  ...props
}: UISurfaceProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className={twMerge("rounded-[28px]", className)}
      style={[
        {
          backgroundColor: elevated ? colors.cardElevated : colors.card,
          borderWidth: elevated ? 0 : 1,
          borderColor: colors.border,
          shadowColor: isDark ? "#00000000" : "#0f172a",
          shadowOpacity: isDark ? 0 : elevated ? 0.12 : 0.06,
          shadowRadius: elevated ? 22 : 14,
          shadowOffset: { width: 0, height: elevated ? 12 : 6 },
          elevation: isDark ? 0 : elevated ? 10 : 4,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function UICard({
  children,
  className,
  style,
  padded = true,
  ...props
}: UICardProps) {
  return (
    <UISurface
      className={twMerge(
        "overflow-hidden rounded-[30px]",
        padded ? "px-6 py-5" : "",
        className,
      )}
      elevated
      style={style}
      {...props}
    >
      {children}
    </UISurface>
  );
}

export function UIButton({
  children,
  label,
  className,
  textClassName,
  style,
  variant = "primary",
  disabled,
  isDisabled,
  ...props
}: UIButtonProps) {
  const { colors } = useAppTheme();
  const finalDisabled = disabled ?? isDisabled ?? false;

  const palette: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: colors.accent, border: colors.accent, text: "#ffffff" },
    secondary: { bg: colors.backgroundSecondary, border: "transparent", text: colors.text },
    ghost: { bg: "transparent", border: "transparent", text: colors.text },
    outline: { bg: "transparent", border: colors.border, text: colors.text },
    danger: { bg: colors.danger, border: colors.danger, text: "#ffffff" },
    "danger-soft": { bg: colors.dangerSoft, border: colors.danger, text: colors.danger },
    tertiary: { bg: colors.cardElevated, border: colors.border, text: colors.text },
  };

  const current = palette[variant] ?? palette.primary;

  return (
    <Pressable
      disabled={finalDisabled}
      className={twMerge(
        "min-h-14 rounded-[24px] px-4 py-3 active:scale-[0.98]",
        className,
      )}
      style={(state: PressableStateCallbackType) => [
        {
          backgroundColor: current.bg,
          borderColor: current.border,
          borderWidth: variant === "outline" ? 1 : 0,
          opacity: finalDisabled ? 0.6 : state.pressed ? 0.92 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {children ?? (
        <Text
          className={twMerge(
            "text-center font-outfit text-sm font-bold uppercase tracking-[1.2px]",
            textClassName,
          )}
          style={{ color: current.text } as TextStyle}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function UIChip({
  label,
  children,
  className,
  textClassName,
  style,
  color = "default",
  disabled,
  ...props
}: UIChipProps) {
  const { colors, isDark } = useAppTheme();

  const palette: Record<string, { bg: string; border: string; text: string }> = {
    accent: {
      bg: isDark ? "rgba(34,197,94,0.18)" : colors.accentLight,
      border: isDark ? "rgba(34,197,94,0.28)" : "rgba(34,197,94,0.18)",
      text: colors.accent,
    },
    success: {
      bg: colors.successSoft,
      border: isDark ? "rgba(16,185,129,0.24)" : "rgba(16,185,129,0.18)",
      text: colors.success,
    },
    warning: {
      bg: colors.warningSoft,
      border: isDark ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.18)",
      text: colors.warning,
    },
    danger: {
      bg: colors.dangerSoft,
      border: isDark ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.18)",
      text: colors.danger,
    },
    default: {
      bg: colors.backgroundSecondary,
      border: colors.border,
      text: colors.textSecondary,
    },
  };

  const current = palette[color] ?? palette.default;
  const resolvedStyle = typeof style === "function" ? undefined : style;

  return (
    <Pressable
      disabled={disabled}
      className={twMerge("self-start rounded-full border px-3 py-1.5", className)}
      style={[
        {
          backgroundColor: current.bg,
          borderColor: current.border,
          borderWidth: color === "default" ? 0 : 1,
          opacity: disabled ? 0.7 : 1,
        },
        resolvedStyle,
      ]}
      {...props}
    >
      {children ?? (
        <Text
          className={twMerge(
            "font-outfit text-[10px] font-bold uppercase tracking-[1.1px]",
            textClassName,
          )}
          style={{ color: current.text } as TextStyle}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function UITextArea({ className, style, ...props }: UITextAreaProps) {
  const { colors } = useAppTheme();

  return (
    <RNTextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={colors.placeholder}
      className={twMerge(
        "min-h-[120px] rounded-[24px] px-4 py-3 font-outfit text-base",
        className,
      )}
      style={[
        {
          backgroundColor: colors.inputBackground,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          fontFamily: "Outfit",
        },
        style,
      ]}
      {...props}
    />
  );
}

export function UISectionHeader({
  eyebrow,
  title,
  description,
  rightSlot,
  className,
}: UISectionHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <View className={twMerge("flex-row items-start justify-between gap-4", className)}>
      <View className="flex-1">
        {eyebrow ? (
          <Text
            className="font-outfit text-[11px] font-semibold uppercase tracking-[1.6px]"
            style={{ color: colors.textSecondary }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          className="mt-1 font-telma-bold text-3xl font-bold tracking-tight"
          style={{ color: colors.text }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            className="mt-2 font-outfit text-sm leading-6"
            style={{ color: colors.textSecondary }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {rightSlot}
    </View>
  );
}

export function UIEmptyState({
  title,
  description,
  action,
  className,
}: UIEmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <UICard className={twMerge("items-center px-5 py-8", className)}>
      <Text className="font-clash text-xl font-bold text-app">{title}</Text>
      <Text
        className="mt-2 text-center font-outfit text-sm leading-6"
        style={{ color: colors.textSecondary }}
      >
        {description}
      </Text>
      {action ? <View className="mt-5">{action}</View> : null}
    </UICard>
  );
}

export function UISkeleton({
  children,
  isLoading = true,
  className,
  style,
}: UISkeletonProps) {
  const { colors, isDark } = useAppTheme();

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <View
      className={twMerge("overflow-hidden rounded-2xl", className)}
      style={[
        {
          backgroundColor: isDark ? colors.backgroundSecondary : colors.cardElevated,
          opacity: isDark ? 0.42 : 0.72,
        },
        style,
      ]}
    />
  );
}

export function UIListItem({
  children,
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className={twMerge(
        "flex-row items-center justify-between rounded-[24px] px-4 py-4",
        className,
      )}
      style={[
        {
          backgroundColor: colors.cardElevated,
          shadowColor: isDark ? "#00000000" : "#0f172a",
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: isDark ? 0 : 3,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

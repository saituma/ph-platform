import React, { useMemo } from "react";
import { HeroUINativeProvider, type HeroUINativeConfig, Button, Card, Chip, Surface, Skeleton, SkeletonGroup, Avatar, Separator, TextArea, TextField, Input, Label, cn, PressableFeedback } from "heroui-native";
import {
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

// ─── Provider ────────────────────────────────────────────────────────────────

export function HeroAppProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo<HeroUINativeConfig>(
    () => ({
      textProps: {
        allowFontScaling: true,
        maxFontSizeMultiplier: 1.3,
      },
      toast: {
        defaultProps: {
          variant: "success",
          placement: "top",
        },
      },
      devInfo: {
        stylingPrinciples: false,
      },
    }),
    [],
  );

  return <HeroUINativeProvider config={config}>{children}</HeroUINativeProvider>;
}

// ─── Re-exports from heroui-native ──────────────────────────────────────────

export { Button, Card, Chip, Surface, Skeleton, SkeletonGroup, Avatar, Separator, TextArea, TextField, Input, Label, cn, PressableFeedback };

// ─── UIButton (HeroUI Button wrapper) ───────────────────────────────────────

type UIButtonProps = PressableProps & {
  className?: string;
  label?: string;
  textClassName?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "danger-soft" | "tertiary";
  isDisabled?: boolean;
};

const VARIANT_MAP: Record<string, "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger"> = {
  primary: "primary",
  secondary: "secondary",
  ghost: "secondary",
  outline: "secondary",
  danger: "danger",
  "danger-soft": "danger",
  tertiary: "tertiary",
};

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
  const finalDisabled = disabled ?? isDisabled ?? false;
  const heroVariant = VARIANT_MAP[variant] ?? "primary";

  return (
    <Button
      variant={heroVariant}
      feedbackVariant="none"
      disabled={finalDisabled}
      className={cn("min-h-12 rounded-[18px] px-4 py-3", className)}
      style={style as any}
      accessibilityLabel={label}
      {...(props as any)}
    >
      {children ?? <Button.Label className={cn("font-semibold", textClassName)}>{label}</Button.Label>}
    </Button>
  );
}

// ─── UISurface (HeroUI Surface wrapper) ─────────────────────────────────────

type UISurfaceProps = ViewProps & {
  className?: string;
  elevated?: boolean;
};

export function UISurface({
  children,
  className,
  style,
  elevated = false,
  ...props
}: UISurfaceProps) {
  return (
    <Surface
      className={cn(
        "rounded-[24px] border border-border",
        elevated ? "bg-default" : "bg-surface",
        className,
      )}
      style={style}
      {...(props as any)}
    >
      {children}
    </Surface>
  );
}

// ─── UICard (HeroUI Card wrapper) ───────────────────────────────────────────

type UICardProps = ViewProps & {
  className?: string;
  padded?: boolean;
};

export function UICard({
  children,
  className,
  style,
  padded = true,
  ...props
}: UICardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[24px] border border-border",
        padded && "px-5 py-4",
        className,
      )}
      style={style}
      {...(props as any)}
    >
      <Card.Body className="p-0">
        {children}
      </Card.Body>
    </Card>
  );
}

// ─── UIChip (HeroUI Chip wrapper) ───────────────────────────────────────────

type UIChipProps = PressableProps & {
  className?: string;
  label: string;
  textClassName?: string;
  children?: React.ReactNode;
  color?: "accent" | "default" | "success" | "warning" | "danger";
};

export function UIChip({
  label,
  children,
  className,
  textClassName,
  color = "default",
  disabled,
  style,
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

  return (
    <Chip
      className={cn("self-start", className)}
      style={[
        {
          backgroundColor: current.bg,
          borderColor: current.border,
          borderWidth: 1,
        },
        style as any,
      ]}
      {...(props as any)}
    >
      {children ?? (
        <Text
          className={cn("font-outfit text-[12px] font-semibold", textClassName)}
          style={{ color: current.text }}
        >
          {label}
        </Text>
      )}
    </Chip>
  );
}

// ─── UITextArea (HeroUI TextArea wrapper) ────────────────────────────────────

type UITextAreaProps = TextInputProps & {
  className?: string;
};

export function UITextArea({ className, style, ...props }: UITextAreaProps) {
  const { colors } = useAppTheme();

  return (
    <TextArea
      placeholderTextColor={colors.placeholder}
      className={cn(
        "min-h-[120px] rounded-[20px] px-4 py-3 font-normal text-base",
        className,
      )}
      style={[
        {
          backgroundColor: colors.inputBackground,
          color: colors.text,
          fontFamily: "Outfit",
        },
        style,
      ]}
      {...(props as any)}
    />
  );
}

// ─── UISectionHeader ─────────────────────────────────────────────────────────

type UISectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  className?: string;
};

export function UISectionHeader({
  eyebrow,
  title,
  description,
  rightSlot,
  className,
}: UISectionHeaderProps) {
  return (
    <View className={cn("flex-row items-start justify-between gap-4", className)}>
      <View className="flex-1">
        {eyebrow ? (
          <Text className="font-outfit text-[11px] font-medium text-muted">
            {eyebrow}
          </Text>
        ) : null}
        <Text
          accessibilityRole="header"
          className="mt-1 font-display text-[28px] font-bold tracking-tight text-foreground"
        >
          {title}
        </Text>
        {description ? (
          <Text className="mt-2 font-outfit text-sm leading-6 text-muted">
            {description}
          </Text>
        ) : null}
      </View>
      {rightSlot}
    </View>
  );
}

// ─── UIEmptyState ────────────────────────────────────────────────────────────

type UIEmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function UIEmptyState({
  title,
  description,
  action,
  className,
}: UIEmptyStateProps) {
  return (
    <UICard className={cn("items-center px-5 py-8", className)}>
      <Text className="font-display text-xl font-bold text-foreground">{title}</Text>
      <Text className="mt-2 text-center font-outfit text-sm leading-6 text-muted">
        {description}
      </Text>
      {action ? <View className="mt-5">{action}</View> : null}
    </UICard>
  );
}

// ─── UISkeleton (HeroUI Skeleton wrapper) ────────────────────────────────────

type UISkeletonProps = {
  isLoading?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function UISkeleton({
  children,
  isLoading = true,
  className,
  style,
}: UISkeletonProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <Skeleton
      variant="pulse"
      className={cn("rounded-2xl", className)}
      style={style as any}
    />
  );
}

// ─── UIListItem (PressableFeedback + Surface) ────────────────────────────────

export function UIListItem({
  children,
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <Surface
      className={cn(
        "flex-row items-center justify-between rounded-[20px] border border-border px-4 py-4",
        className,
      )}
      style={style}
      {...(props as any)}
    >
      {children}
    </Surface>
  );
}

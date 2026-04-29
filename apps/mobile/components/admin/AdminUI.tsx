import React from "react";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  AlertCircle,
  ChevronRight,
  Search,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Shadows, radius as radiusPresets } from "@/constants/theme";

type AdminTone = "neutral" | "accent" | "success" | "info" | "warning" | "danger";

type ToneStyle = {
  color: string;
  bg: string;
  border: string;
};

function withAlpha(hex: string, alpha: string) {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  return `${hex}${alpha}`;
}

function getAdminTone(
  colors: ReturnType<typeof useAppTheme>["colors"],
  isDark: boolean,
  tone: AdminTone = "neutral",
): ToneStyle {
  const neutralBg = isDark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.035)";
  const neutralBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(15,23,42,0.08)";
  const map: Record<AdminTone, string> = {
    neutral: colors.textSecondary,
    accent: colors.accent,
    success: colors.success,
    info: colors.cyan,
    warning: colors.warning,
    danger: colors.danger,
  };

  if (tone === "neutral") {
    return {
      color: colors.textSecondary,
      bg: neutralBg,
      border: neutralBorder,
    };
  }

  const color = map[tone];
  return {
    color,
    bg: isDark ? withAlpha(color, "20") : withAlpha(color, "14"),
    border: isDark ? withAlpha(color, "3D") : withAlpha(color, "29"),
  };
}

function useAdminTone(tone: AdminTone = "neutral"): ToneStyle {
  const { colors, isDark } = useAppTheme();
  return getAdminTone(colors, isDark, tone);
}

export function AdminScreen({
  children,
  withSafeTop = true,
  style,
}: {
  children: React.ReactNode;
  withSafeTop?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useAppTheme();

  if (!withSafeTop) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
}

export function AdminHeader({
  eyebrow,
  title,
  subtitle,
  tone = "accent",
  right,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: AdminTone;
  right?: React.ReactNode;
  compact?: boolean;
}) {
  const { colors } = useAppTheme();
  const toneStyle = useAdminTone(tone);

  return (
    <View
      style={{
        paddingTop: compact ? 20 : 36,
        paddingHorizontal: 20,
        paddingBottom: compact ? 14 : 22,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            width: 4,
            height: compact ? 42 : 54,
            borderRadius: 999,
            backgroundColor: toneStyle.color,
          }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          {eyebrow ? (
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 11,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: toneStyle.color,
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {eyebrow}
            </Text>
          ) : null}
          <Text
            style={{
              fontFamily: "Satoshi-Bold",
              fontSize: compact ? 30 : 36,
              lineHeight: compact ? 34 : 40,
              color: colors.textPrimary,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 13,
                lineHeight: 18,
                color: colors.textSecondary,
                marginTop: 5,
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function AdminCard({
  children,
  style,
  padding = 16,
  pressed,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: number;
  pressed?: boolean;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={[
        {
          borderRadius: radiusPresets.lg,
          borderWidth: 1,
          padding,
          backgroundColor: isDark ? colors.cardElevated : colors.card,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
          ...(isDark ? Shadows.none : Shadows.sm),
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AdminBadge({
  children,
  tone = "neutral",
  style,
  textStyle,
}: {
  children: React.ReactNode;
  tone?: AdminTone;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const toneStyle = useAdminTone(tone);

  return (
    <View
      style={[
        {
          minHeight: 24,
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: radiusPresets.pill,
          borderWidth: 1,
          borderColor: toneStyle.border,
          backgroundColor: toneStyle.bg,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            fontFamily: "Outfit-Bold",
            fontSize: 11,
            lineHeight: 14,
            color: toneStyle.color,
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

export function AdminIconButton({
  icon: Icon,
  onPress,
  tone = "neutral",
  disabled,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  tone?: AdminTone;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const toneStyle = useAdminTone(tone);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: toneStyle.border,
        backgroundColor: toneStyle.bg,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Icon size={18} color={toneStyle.color} strokeWidth={2.2} />
    </Pressable>
  );
}

export function AdminInput({
  value,
  onChangeText,
  placeholder,
  leftIcon: LeftIcon = Search,
  onClear,
  containerStyle,
  ...props
}: TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  leftIcon?: LucideIcon;
  onClear?: () => void;
  containerStyle?: ViewStyle;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={[
        {
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          paddingHorizontal: 13,
          borderRadius: 14,
          borderWidth: 1,
          backgroundColor: isDark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.035)",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
        },
        containerStyle,
      ]}
    >
      <LeftIcon size={17} color={colors.textSecondary} strokeWidth={2.1} />
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        returnKeyType={props.returnKeyType ?? "search"}
        autoCorrect={props.autoCorrect ?? false}
        style={[
          {
            flex: 1,
            padding: 0,
            fontFamily: "Outfit-Regular",
            fontSize: 14,
            color: colors.textPrimary,
          },
          props.style,
        ]}
      />
      {value.length > 0 && onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          hitSlop={8}
        >
          <X size={16} color={colors.textSecondary} strokeWidth={2.1} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AdminSegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: {
    key: T;
    label: string;
    icon: LucideIcon;
    tone?: AdminTone;
    badgeCount?: number;
  }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 5,
        padding: 5,
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 18,
        borderWidth: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "rgba(15,23,42,0.03)",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        const toneStyle = getAdminTone(colors, isDark, tab.tone ?? "accent");
        const Icon = tab.icon;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 46,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 7,
              backgroundColor: selected ? toneStyle.bg : "transparent",
              borderWidth: selected ? 1 : 0,
              borderColor: selected ? toneStyle.border : "transparent",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View>
              <Icon
                size={16}
                color={selected ? toneStyle.color : colors.textSecondary}
                strokeWidth={selected ? 2.35 : 2}
              />
              {tab.badgeCount && tab.badgeCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -5,
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: toneStyle.color,
                  }}
                />
              ) : null}
            </View>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 11,
                textTransform: "uppercase",
                color: selected ? toneStyle.color : colors.textSecondary,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AdminEmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  tone = "neutral",
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  tone?: AdminTone;
  action?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const toneStyle = useAdminTone(tone);

  return (
    <View
      style={{
        paddingVertical: 46,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          backgroundColor: toneStyle.bg,
          borderColor: toneStyle.border,
        }}
      >
        <Icon size={25} color={toneStyle.color} strokeWidth={2.1} />
      </View>
      <View style={{ gap: 4, alignItems: "center" }}>
        <Text
          style={{
            fontFamily: "Satoshi-Bold",
            fontSize: 16,
            color: colors.textPrimary,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 13,
              lineHeight: 18,
              color: colors.textSecondary,
              textAlign: "center",
              maxWidth: 260,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function AdminLoadingState({ label = "Loading" }: { label?: string }) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        minHeight: 180,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <ActivityIndicator color={colors.accent} />
      <Text
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 13,
          color: colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function AdminListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  unreadCount,
  tone = "accent",
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  unreadCount?: number;
  tone?: AdminTone;
}) {
  const { colors } = useAppTheme();
  const toneStyle = useAdminTone(tone);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.992 : 1 }],
      })}
    >
      {({ pressed }) => (
        <AdminCard padding={14} pressed={pressed}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {leading}
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Satoshi-Bold",
                    fontSize: 15,
                    color: colors.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {meta ? (
                  <Text
                    style={{
                      fontFamily: "Outfit-Regular",
                      fontSize: 11,
                      color: colors.textSecondary,
                    }}
                    numberOfLines={1}
                  >
                    {meta}
                  </Text>
                ) : null}
              </View>
              {subtitle ? (
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 13,
                    lineHeight: 18,
                    color: colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {unreadCount && unreadCount > 0 ? (
              <View
                style={{
                  minWidth: 24,
                  height: 24,
                  paddingHorizontal: 7,
                  borderRadius: 999,
                  backgroundColor: toneStyle.color,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 11,
                    color: "#FFFFFF",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : trailing ?? (
              <ChevronRight size={17} color={colors.textSecondary} strokeWidth={2.1} />
            )}
          </View>
        </AdminCard>
      )}
    </Pressable>
  );
}

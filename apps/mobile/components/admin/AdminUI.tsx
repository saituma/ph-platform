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
import { adminPastel, type AdminCardColor, type AdminPastelColors } from "@/constants/theme";

export function useAdminPastel() {
  const { isDark } = useAppTheme();
  return (isDark ? adminPastel.dark : adminPastel.light) as typeof adminPastel.light;
}

const CARD_COLOR_KEY: Record<AdminCardColor, keyof AdminPastelColors> = {
  sage: "cardSage",
  pink: "cardPink",
  lavender: "cardLavender",
  peach: "cardPeach",
  mint: "cardMint",
  yellow: "cardYellow",
  white: "cardWhite",
};

function cardBg(p: AdminPastelColors, color: AdminCardColor = "white"): string {
  return p[CARD_COLOR_KEY[color]] as string;
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
  const p = useAdminPastel();

  if (!withSafeTop) {
    return (
      <View style={[{ flex: 1, backgroundColor: p.pageBg }, style]}>
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[{ flex: 1, backgroundColor: p.pageBg }, style]}>
      {children}
    </SafeAreaView>
  );
}

export function AdminHeader({
  title,
  subtitle,
  right,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: string;
  right?: React.ReactNode;
  compact?: boolean;
}) {
  const p = useAdminPastel();

  return (
    <View
      style={{
        paddingTop: compact ? 16 : 24,
        paddingHorizontal: 24,
        paddingBottom: compact ? 14 : 20,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: "Outfit-ExtraBold",
              fontSize: compact ? 28 : 34,
              lineHeight: compact ? 34 : 40,
              color: p.textPrimary,
              letterSpacing: -0.8,
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
                fontSize: 14,
                lineHeight: 20,
                color: p.textSecondary,
                marginTop: 4,
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

export function AdminBackButton({ onPress }: { onPress: () => void }) {
  const p = useAdminPastel();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: p.cardWhite,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: p.shadow,
        shadowOpacity: 1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <ChevronRight
        size={20}
        color={p.textPrimary}
        strokeWidth={2.2}
        style={{ transform: [{ scaleX: -1 }] }}
      />
    </Pressable>
  );
}

export function AdminCard({
  children,
  color = "white",
  style,
  padding = 20,
  onPress,
  onLongPress,
}: {
  children: React.ReactNode;
  color?: AdminCardColor;
  style?: ViewStyle | ViewStyle[];
  padding?: number;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const p = useAdminPastel();
  const bg = cardBg(p, color);

  const inner = (pressed = false) => (
    <View
      style={[
        {
          borderRadius: 28,
          padding,
          backgroundColor: bg,
          shadowColor: p.shadow,
          shadowOpacity: 1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        style={{ borderRadius: 28 }}
      >
        {({ pressed }) => inner(pressed)}
      </Pressable>
    );
  }

  return inner();
}

export function AdminDashboardGrid({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 14,
          paddingHorizontal: 24,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AdminGridItem({
  children,
  color = "white",
  style,
}: {
  children: React.ReactNode;
  color?: AdminCardColor;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flex: 1, minWidth: "45%" }, style]}>
      <AdminCard color={color} padding={18}>
        {children}
      </AdminCard>
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function AdminButton({
  label,
  variant = "primary",
  onPress,
  icon: Icon,
  disabled,
  loading,
  style,
  compact = false,
}: {
  label: string;
  variant?: ButtonVariant;
  onPress: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}) {
  const p = useAdminPastel();

  const bgMap: Record<ButtonVariant, string> = {
    primary: p.buttonPrimary,
    secondary: p.accentSoft,
    ghost: "transparent",
    danger: p.dangerSoft,
  };
  const textMap: Record<ButtonVariant, string> = {
    primary: p.buttonPrimaryText,
    secondary: p.accent,
    ghost: p.textSecondary,
    danger: p.danger,
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: compact ? 40 : 48,
          paddingHorizontal: compact ? 16 : 24,
          borderRadius: 100,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: bgMap[variant],
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textMap[variant]} />
      ) : (
        <>
          {Icon ? <Icon size={compact ? 15 : 17} color={textMap[variant]} strokeWidth={2.3} /> : null}
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: compact ? 12 : 14,
              letterSpacing: 0.3,
              color: textMap[variant],
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function AdminBadge({
  children,
  color = "lavender",
  style,
  textStyle,
}: {
  children: React.ReactNode;
  color?: AdminCardColor;
  tone?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const p = useAdminPastel();

  return (
    <View
      style={[
        {
          minHeight: 24,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 100,
          backgroundColor: cardBg(p, color),
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
            color: p.textSecondary,
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
  variant = "ghost",
  disabled,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  variant?: "ghost" | "danger" | "accent";
  tone?: string;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const p = useAdminPastel();

  const bgMap = {
    ghost: p.inputBg,
    danger: p.dangerSoft,
    accent: p.accentSoft,
  };
  const colorMap = {
    ghost: p.textSecondary,
    danger: p.danger,
    accent: p.accent,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bgMap[variant],
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      <Icon size={18} color={colorMap[variant]} strokeWidth={2.2} />
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
  const p = useAdminPastel();

  return (
    <View
      style={[
        {
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: p.inputBg,
        },
        containerStyle,
      ]}
    >
      <LeftIcon size={18} color={p.textMuted} strokeWidth={2} />
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.textMuted}
        returnKeyType={props.returnKeyType ?? "search"}
        autoCorrect={props.autoCorrect ?? false}
        style={[
          {
            flex: 1,
            padding: 0,
            fontFamily: "Outfit-Regular",
            fontSize: 15,
            color: p.textPrimary,
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
          <X size={16} color={p.textMuted} strokeWidth={2} />
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
    icon?: LucideIcon;
    badgeCount?: number;
  }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const p = useAdminPastel();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        padding: 5,
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 24,
        backgroundColor: p.inputBg,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        const Icon = tab.icon;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 7,
              backgroundColor: selected ? p.cardWhite : "transparent",
              shadowColor: selected ? p.shadow : "transparent",
              shadowOpacity: selected ? 1 : 0,
              shadowRadius: selected ? 8 : 0,
              shadowOffset: { width: 0, height: 2 },
              elevation: selected ? 2 : 0,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            {Icon ? (
              <View>
                <Icon
                  size={16}
                  color={selected ? p.accent : p.textMuted}
                  strokeWidth={selected ? 2.3 : 2}
                />
                {tab.badgeCount && tab.badgeCount > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -4,
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      backgroundColor: p.danger,
                    }}
                  />
                ) : null}
              </View>
            ) : null}
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 13,
                color: selected ? p.textPrimary : p.textMuted,
              }}
              numberOfLines={1}
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
  action,
  color = "lavender",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  color?: AdminCardColor;
  tone?: string;
}) {
  const p = useAdminPastel();

  return (
    <View
      style={{
        paddingVertical: 56,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: cardBg(p, color),
        }}
      >
        <Icon size={28} color={p.textMuted} strokeWidth={1.8} />
      </View>
      <View style={{ gap: 6, alignItems: "center" }}>
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 17,
            color: p.textPrimary,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 14,
              lineHeight: 20,
              color: p.textSecondary,
              textAlign: "center",
              maxWidth: 280,
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
  const p = useAdminPastel();

  return (
    <View
      style={{
        flex: 1,
        minHeight: 200,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <ActivityIndicator color={p.accent} size="large" />
      <Text
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 14,
          color: p.textMuted,
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
  color = "white",
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  unreadCount?: number;
  color?: AdminCardColor;
  tone?: string;
}) {
  const p = useAdminPastel();

  return (
    <AdminCard color={color} onPress={onPress} padding={16}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {leading}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                flex: 1,
                fontFamily: "Outfit-Bold",
                fontSize: 16,
                color: p.textPrimary,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {meta ? (
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textMuted,
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
                color: p.textSecondary,
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
              minWidth: 26,
              height: 26,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: p.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 11,
                color: p.buttonPrimaryText,
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : trailing ?? (
          <ChevronRight size={18} color={p.textMuted} strokeWidth={2} />
        )}
      </View>
    </AdminCard>
  );
}

export function AdminModalContainer({
  children,
  onClose,
  position = "center",
}: {
  children: React.ReactNode;
  onClose: () => void;
  position?: "center" | "bottom";
}) {
  const p = useAdminPastel();

  return (
    <Pressable
      style={{
        flex: 1,
        backgroundColor: p.overlay,
        alignItems: position === "center" ? "center" : "center",
        justifyContent: position === "center" ? "center" : "flex-end",
        padding: position === "center" ? 24 : 0,
      }}
      onPress={onClose}
    >
      <Pressable
        style={{
          width: position === "center" ? "100%" : "100%",
          maxWidth: position === "center" ? 400 : undefined,
          maxHeight: position === "bottom" ? "85%" : undefined,
          borderRadius: position === "center" ? 32 : 0,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding: 28,
          backgroundColor: p.cardWhite,
          shadowColor: p.shadowMd,
          shadowOpacity: 1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        }}
      >
        {children}
      </Pressable>
    </Pressable>
  );
}

export function AdminModalTitle({ children }: { children: string }) {
  const p = useAdminPastel();
  return (
    <Text
      style={{
        fontFamily: "Outfit-ExtraBold",
        fontSize: 22,
        color: p.textPrimary,
        letterSpacing: -0.4,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

export function AdminModalSubtitle({ children }: { children: string }) {
  const p = useAdminPastel();
  return (
    <Text
      style={{
        fontFamily: "Outfit-Regular",
        fontSize: 14,
        color: p.textSecondary,
        marginBottom: 20,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}

export function AdminFormField({
  label,
  value,
  onChangeText,
  placeholder,
  autoFocus,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  keyboardType?: "default" | "number-pad" | "url";
  multiline?: boolean;
}) {
  const p = useAdminPastel();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 12,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: p.textMuted,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderRadius: 20,
          paddingHorizontal: 18,
          minHeight: multiline ? 80 : 52,
          justifyContent: multiline ? "flex-start" : "center",
          paddingVertical: multiline ? 14 : 0,
          backgroundColor: p.inputBg,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={p.textMuted}
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 16,
            color: p.textPrimary,
          }}
          cursorColor={p.accent}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
    </View>
  );
}

export function AdminChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const p = useAdminPastel();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const selected = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 100,
              backgroundColor: selected ? p.buttonPrimary : p.inputBg,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 13,
                color: selected ? p.buttonPrimaryText : p.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function isValidHex(color: string | null | undefined): boolean {
  if (!color || typeof color !== "string") return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
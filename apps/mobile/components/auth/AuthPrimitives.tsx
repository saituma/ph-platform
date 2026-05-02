import { Feather } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type AuthHeaderProps = {
  badge?: string;
  title: string;
  subtitle: string;
};

type AuthFormGroupProps = {
  children: ReactNode;
};

type AuthFieldRowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  error?: string;
  isLast?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
};

type AuthPrimaryButtonProps = {
  label: string;
  busyLabel: string;
  isBusy?: boolean;
  onPress: () => void;
};

export function AuthHeader({ badge, title, subtitle }: AuthHeaderProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.header}>
      {badge ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark ? `${colors.accent}20` : colors.accentLight,
              borderColor: isDark ? `${colors.accent}30` : `${colors.accent}24`,
            },
          ]}
        >
          <Text
            className="font-outfit-semibold uppercase"
            style={[styles.badgeText, { color: colors.accent }]}
          >
            {badge}
          </Text>
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        className="font-outfit-semibold"
        selectable
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <Text
        className="font-outfit"
        selectable
        style={[styles.subtitle, { color: colors.textSecondary }]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

export function AuthFormGroup({ children }: AuthFormGroupProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.formGroup,
        {
          backgroundColor: isDark ? colors.cardElevated : colors.card,
          borderColor: `${colors.border}`,
          boxShadow: isDark
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 18px 38px rgba(15, 23, 42, 0.06)",
        },
      ]}
    >
      {children}
    </View>
  );
}

export function AuthFieldRow({
  icon,
  label,
  error,
  isLast = false,
  trailing,
  children,
}: AuthFieldRowProps) {
  const { colors, isDark } = useAppTheme();
  const tint = error ? colors.danger : colors.textSecondary;

  return (
    <View accessibilityLabel={label} accessibilityRole="text">
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isDark ? `${colors.background}80` : colors.backgroundSecondary,
            },
          ]}
        >
          <Feather name={icon} size={17} color={tint} />
        </View>
        <View style={styles.inputWrap}>
          <Text className="font-outfit-medium" style={[styles.label, { color: tint }]}>
            {label}
          </Text>
          {children}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {!isLast ? (
        <View
          style={[
            styles.separator,
            { backgroundColor: isDark ? `${colors.border}` : `${colors.border}` },
          ]}
        />
      ) : null}
      {error ? (
        <Text className="font-outfit" selectable style={[styles.errorText, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  busyLabel,
  isBusy = false,
  onPress,
}: AuthPrimaryButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isBusy ? busyLabel : label}
      accessibilityState={{ disabled: isBusy, busy: isBusy }}
      disabled={isBusy}
      onPress={onPress}
      style={[
        styles.primaryButton,
        {
          backgroundColor: colors.accent,
          opacity: isBusy ? 0.72 : 1,
          boxShadow: "0 14px 28px rgba(34, 197, 94, 0.22)",
        },
      ]}
    >
      <Text className="font-outfit-semibold" style={styles.primaryButtonText}>
        {isBusy ? busyLabel : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
    marginBottom: 28,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 360,
  },
  formGroup: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
  trailing: {
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 66,
    marginRight: 18,
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...Platform.select({
      ios: {
        borderCurve: "continuous",
      },
      default: {},
    }),
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
  },
});

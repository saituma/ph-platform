import { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Mail, Lock, Shield, Eye, EyeOff } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";

const LUCIDE_ICONS: Record<string, any> = {
  mail: Mail,
  lock: Lock,
  shield: Shield,
  eye: Eye,
  "eye-off": EyeOff,
};

type AuthHeaderProps = {
  badge?: string;
  title: string;
  subtitle: string;
};

type AuthFormGroupProps = {
  children: ReactNode;
};

type AuthFieldRowProps = {
  icon: string;
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
  const p = useAdminPastel();

  return (
    <View style={styles.header}>
      {badge ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: p.accentSoft },
          ]}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 11,
              letterSpacing: 1.1,
              color: p.accent,
              textTransform: "uppercase",
            }}
          >
            {badge}
          </Text>
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 34,
          lineHeight: 38,
          letterSpacing: -0.7,
          color: p.textPrimary,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 16,
          lineHeight: 24,
          color: p.textMuted,
          maxWidth: 360,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

export function AuthFormGroup({ children }: AuthFormGroupProps) {
  const p = useAdminPastel();

  return (
    <View
      style={[
        styles.formGroup,
        { backgroundColor: p.inputBg },
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
  const p = useAdminPastel();
  const tint = error ? "#E53935" : p.textMuted;
  const IconComponent = LUCIDE_ICONS[icon];

  return (
    <View accessibilityLabel={label} accessibilityRole="text">
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: p.cardMint },
          ]}
        >
          {IconComponent ? (
            <IconComponent size={17} color={tint} strokeWidth={2} />
          ) : null}
        </View>
        <View style={styles.inputWrap}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 12,
              lineHeight: 16,
              color: tint,
            }}
          >
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
            { backgroundColor: p.inputBorder },
          ]}
        />
      ) : null}
      {error ? (
        <Text
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 12,
            lineHeight: 18,
            marginLeft: 66,
            marginRight: 18,
            marginBottom: 12,
            color: "#E53935",
          }}
        >
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
  const p = useAdminPastel();

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
          backgroundColor: p.accent,
          opacity: isBusy ? 0.72 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 17,
          color: p.buttonPrimaryText,
        }}
      >
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
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  formGroup: {
    borderRadius: 24,
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
  trailing: {
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 100,
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
});

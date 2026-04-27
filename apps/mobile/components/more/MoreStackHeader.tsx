import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants/theme";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

type MoreStackHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  backHref?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
};

export function MoreStackHeader({
  title,
  subtitle,
  badge,
  backHref = "/(tabs)/more",
  onBack,
  rightSlot,
}: MoreStackHeaderProps) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : "hsl(150, 30%, 97%)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const accentSoft = isDark
    ? "rgba(34,197,94,0.14)"
    : "rgba(34,197,94,0.10)";

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 12, backgroundColor: colors.background }}>
      <View
        style={{
          overflow: "hidden",
          borderRadius: 24,
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingBottom: 16,
          paddingTop: 16,
          backgroundColor: cardBg,
          borderColor: cardBorder,
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -40,
            top: -32,
            height: 112,
            width: 112,
            borderRadius: 56,
            backgroundColor: accentSoft,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -32,
            left: 48,
            height: 96,
            width: 96,
            borderRadius: 48,
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)",
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Pressable
            onPress={() => {
              if (onBack) {
                onBack();
                return;
              }
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(backHref as any);
              }
            }}
            hitSlop={10}
            style={({ pressed }) => ({
              height: 44,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={20} color={colors.accent} />
          </Pressable>

          {rightSlot ?? (badge ? (
            <View
              style={{
                borderRadius: 99,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fonts.bodyBold,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  color: colors.accent,
                }}
              >
                {badge}
              </Text>
            </View>
          ) : <View style={{ width: 44 }} />)}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontFamily: "TelmaBold",
              fontSize: 28,
              letterSpacing: -0.3,
              color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)",
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: 8,
                fontSize: 15,
                lineHeight: 22,
                fontFamily: "Outfit",
                color: isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,45%)",
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

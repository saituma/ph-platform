import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";
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

  return (
    <View className="px-4 pb-2 pt-3" style={{ backgroundColor: colors.background }}>
      <View
        className="overflow-hidden rounded-[30px] border px-4 pb-4 pt-4"
        style={{
          backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.md),
        }}
      >
        <View
          className="absolute -right-10 -top-8 h-28 w-28 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.10)" }}
        />
        <View
          className="absolute -bottom-8 left-12 h-24 w-24 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)" }}
        />

        <View className="flex-row items-center justify-between gap-3">
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
            className="h-11 w-11 items-center justify-center rounded-[18px] active:opacity-80"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.85)",
            }}
          >
            <Feather
              name="arrow-left"
              size={20}
              color={colors.accent}
              // Feather's arrow-left glyph is slightly right-heavy; nudge for optical centering.
              style={{ transform: [{ translateX: -0.5 }] }}
            />
          </Pressable>

          {rightSlot ?? (badge ? (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)" }}
            >
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]" style={{ color: colors.accent }}>
                {badge}
              </Text>
            </View>
          ) : <View className="w-11" />)}
        </View>

        <View className="mt-4">
          <Text className="font-telma-bold text-3xl font-bold tracking-tight" style={{ color: colors.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-2 text-base leading-6 font-outfit" style={{ color: colors.textSecondary }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

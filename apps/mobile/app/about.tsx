import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useMemo } from "react";
import { Linking, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT_SITE_URL = "https://www.instagram.com/ph.perform/";
const INSTAGRAM_URL = "https://www.instagram.com/ph.perform/";

export default function AboutScreen() {
  const { colors, isDark } = useAppTheme();

  const versionLine = useMemo(() => {
    const appVersion = Constants.expoConfig?.version ?? "—";
    const expoCfg = Constants.expoConfig as
      | { ios?: { buildNumber?: string }; android?: { versionCode?: string } }
      | undefined;
    const build =
      Constants.nativeBuildVersion ??
      expoCfg?.ios?.buildNumber ??
      (expoCfg?.android?.versionCode != null ? String(expoCfg.android.versionCode) : "");
    return build ? `${appVersion} (build ${build})` : appVersion;
  }, []);

  const siteUrl = process.env.EXPO_PUBLIC_MARKETING_SITE_URL?.trim() || DEFAULT_SITE_URL;

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    ...(isDark ? Shadows.none : Shadows.sm),
  };

  const mutedFill = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
  const accentSoft = isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)";

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["top"]}>
      <MoreStackHeader
        title="About App"
        subtitle="Platform overview, mission, and how to stay in touch with the team."
        badge="About"
      />

      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 36,
        }}
      >
        {/* Hero */}
        <View className="items-center mb-8">
          <View
            className="w-[88px] h-[88px] rounded-[28px] items-center justify-center mb-5 border"
            style={{
              backgroundColor: accentSoft,
              borderColor: isDark ? "rgba(34,197,94,0.35)" : "rgba(34,197,94,0.25)",
              ...(isDark ? Shadows.none : Shadows.md),
            }}
          >
            <View
              className="w-[60px] h-[60px] rounded-[20px] items-center justify-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Feather name="activity" size={30} color="#FFFFFF" />
            </View>
          </View>
          <Text className="text-3xl font-telma-bold text-center" style={{ color: colors.text }}>
            PHP Coaching
          </Text>
          <View
            className="mt-3 px-3 py-1.5 rounded-full border"
            style={{ backgroundColor: mutedFill, borderColor: cardStyle.borderColor as string }}
          >
            <Text className="text-xs font-outfit font-medium" style={{ color: colors.textSecondary }}>
              Version {versionLine}
            </Text>
          </View>
        </View>

        {/* Mission + platform */}
        <View className="rounded-[28px] border px-5 py-5 mb-4" style={cardStyle}>
          <View className="flex-row items-center gap-2 mb-3">
            <View
              className="h-8 w-8 rounded-xl items-center justify-center"
              style={{ backgroundColor: accentSoft }}
            >
              <Feather name="target" size={16} color={colors.accent} />
            </View>
            <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>
              Our mission
            </Text>
          </View>
          <Text className="text-[15px] font-outfit leading-[22px] mb-5" style={{ color: colors.textSecondary }}>
            Professional-grade football coaching and athletic development for young athletes — grounded in science
            and elite experience.
          </Text>

          <View
            className="h-px w-full mb-5"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}
          />

          <View className="flex-row items-center gap-2 mb-3">
            <View
              className="h-8 w-8 rounded-xl items-center justify-center"
              style={{ backgroundColor: accentSoft }}
            >
              <Feather name="smartphone" size={16} color={colors.accent} />
            </View>
            <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>
              The platform
            </Text>
          </View>
          <Text className="text-[15px] font-outfit leading-[22px]" style={{ color: colors.textSecondary }}>
            Built by coaches and developers at Lift Lab to bridge amateur play and professional pathways.
          </Text>
        </View>

        {/* Social — full-width row so it reads as a real button in light mode */}
        <Text
          className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px] mb-2 px-1"
          style={{ color: colors.textSecondary }}
        >
          Connect
        </Text>
        <Pressable
          onPress={() => void Linking.openURL(INSTAGRAM_URL)}
          accessibilityRole="link"
          accessibilityLabel="Follow PH Performance on Instagram"
          className="flex-row items-center gap-4 rounded-[22px] border px-4 py-4 mb-4 active:opacity-90"
          style={{
            backgroundColor: isDark ? colors.cardElevated : colors.backgroundSecondary,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
            ...(isDark ? Shadows.none : Shadows.sm),
          }}
        >
          <View
            className="h-12 w-12 rounded-2xl items-center justify-center border"
            style={{
              backgroundColor: isDark ? "rgba(225,48,108,0.12)" : "rgba(225,48,108,0.08)",
              borderColor: isDark ? "rgba(225,48,108,0.25)" : "rgba(225,48,108,0.2)",
            }}
          >
            <Ionicons name="logo-instagram" size={26} color="#E1306C" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-clash font-semibold" style={{ color: colors.text }}>
              Instagram
            </Text>
            <Text className="text-sm font-outfit mt-0.5" style={{ color: colors.textSecondary }}>
              @ph.perform — updates, drills, and community
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.icon} />
        </Pressable>

        {/* Primary CTA — accent fill + white copy (always readable) */}
        <Pressable
          onPress={() => void Linking.openURL(siteUrl)}
          className="h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5 active:opacity-92"
          style={{
            backgroundColor: colors.accent,
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <Feather name="external-link" size={20} color="#FFFFFF" />
          <Text className="text-base font-clash font-bold" style={{ color: "#FFFFFF" }}>
            Visit website
          </Text>
        </Pressable>

        <Text
          className="text-center font-outfit text-[10px] mt-8 uppercase tracking-[2px] px-4 leading-4"
          style={{ color: colors.textSecondary }}
        >
          © 2026 Lift Lab Ltd. All rights reserved.
        </Text>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

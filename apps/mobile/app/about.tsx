import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import Constants from "expo-constants";
import React, { useMemo } from "react";
import { Linking, Pressable, View } from "react-native";

const INSTAGRAM_URL = "https://www.instagram.com/ph.perform/";

export default function AboutScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : "hsl(150, 30%, 97%)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const accentSoft = isDark ? `${colors.accent}18` : `${colors.accent}14`;
  const mutedFill = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";

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

  const siteUrl = process.env.EXPO_PUBLIC_MARKETING_SITE_URL?.trim() || INSTAGRAM_URL;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
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
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              borderWidth: 1,
              backgroundColor: isDark ? "hsla(155, 25%, 50%, 0.14)" : "hsla(155, 35%, 50%, 0.10)",
              borderColor: isDark ? "hsla(155, 25%, 50%, 0.35)" : "hsla(155, 35%, 50%, 0.25)",
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
              }}
            >
              <Ionicons name="pulse-outline" size={30} color="hsl(220, 5%, 98%)" />
            </View>
          </View>
          <Text style={{ fontSize: 28, fontFamily: "TelmaBold", textAlign: "center", color: textPrimary }}>
            PHP Coaching
          </Text>
          <View
            style={{
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
              borderWidth: 1,
              backgroundColor: mutedFill,
              borderColor: cardBorder,
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: fonts.bodyMedium, color: labelColor }}>
              Version {versionLine}
            </Text>
          </View>
        </View>

        {/* Mission + platform */}
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 20,
            marginBottom: 16,
            backgroundColor: cardBg,
            borderColor: cardBorder,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View
              style={{
                height: 32,
                width: 32,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: accentSoft,
              }}
            >
              <Ionicons name="locate-outline" size={16} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
              Our mission
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit", lineHeight: 22, marginBottom: 20, color: labelColor }}>
            Professional-grade football coaching and athletic development for young athletes — grounded in science
            and elite experience.
          </Text>

          <View
            style={{
              height: 1,
              width: "100%",
              marginBottom: 20,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View
              style={{
                height: 32,
                width: 32,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: accentSoft,
              }}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
              The platform
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit", lineHeight: 22, color: labelColor }}>
            Built by coaches and developers at Lift Lab to bridge amateur play and professional pathways.
          </Text>
        </View>

        {/* Social — Instagram */}
        <Text
          style={{
            fontSize: 10,
            fontFamily: fonts.bodyBold,
            textTransform: "uppercase",
            letterSpacing: 1.4,
            marginBottom: 8,
            paddingHorizontal: 4,
            color: labelColor,
          }}
        >
          Connect
        </Text>
        <Pressable
          onPress={() => void Linking.openURL(INSTAGRAM_URL)}
          accessibilityRole="link"
          accessibilityLabel="Follow PH Performance on Instagram"
          style={{ marginBottom: 16 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              borderRadius: 20,
              borderWidth: 1,
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <View
              style={{
                height: 48,
                width: 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                backgroundColor: isDark ? "hsla(340, 25%, 50%, 0.12)" : "hsla(340, 30%, 50%, 0.08)",
                borderColor: isDark ? "hsla(340, 25%, 50%, 0.25)" : "hsla(340, 30%, 50%, 0.2)",
              }}
            >
              <Ionicons name="logo-instagram" size={26} color={isDark ? "hsl(340, 35%, 65%)" : "hsl(340, 50%, 50%)"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
                Instagram
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Outfit", marginTop: 2, color: labelColor }}>
                @ph.perform — updates, drills, and community
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,60%)"} />
          </View>
        </Pressable>

        {/* Primary CTA */}
        <Pressable onPress={() => void Linking.openURL(siteUrl)}>
          <View
            style={{
              height: 56,
              borderRadius: 20,
              backgroundColor: colors.accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={{ fontSize: 16, fontFamily: "ClashDisplay-Bold", color: "#fff" }}>
              Visit Website
            </Text>
          </View>
        </Pressable>

        <Text
          style={{
            textAlign: "center",
            fontFamily: "Outfit",
            fontSize: 10,
            marginTop: 32,
            textTransform: "uppercase",
            letterSpacing: 2,
            paddingHorizontal: 16,
            lineHeight: 16,
            color: labelColor,
          }}
        >
          © 2026 Lift Lab Ltd. All rights reserved.
        </Text>
      </ThemedScrollView>
    </View>
  );
}

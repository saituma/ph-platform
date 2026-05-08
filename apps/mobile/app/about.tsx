import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import Constants from "expo-constants";
import React, { useMemo } from "react";
import { Linking, Pressable, View } from "react-native";
import { Info, Globe, Code, Heart, ChevronLeft } from "lucide-react-native";

const INSTAGRAM_URL = "https://www.instagram.com/ph.perform/";

export default function AboutScreen() {
  const insets = useAppSafeAreaInsets();
  const p = useAdminPastel();

  const cardBg = p.cardSage;
  const versionCardBg = p.cardMint;
  const labelColor = "rgba(255,255,255,0.75)";
  const textPrimary = "#FFFFFF";
  const accent = p.accent;
  const accentSoft = p.accentSoft;
  const mutedFill = p.inputBg;
  const pageBg = p.pageBg;
  const radius = 28;

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
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: pageBg }}>
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
              backgroundColor: p.cardLavender,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: accent,
              }}
            >
              <Heart size={30} color="hsl(220, 5%, 98%)" />
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
                            backgroundColor: versionCardBg,
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
            borderRadius: radius,
                        paddingHorizontal: 20,
            paddingVertical: 20,
            marginBottom: 16,
            backgroundColor: cardBg,
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
              <Info size={16} color={accent} />
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
              backgroundColor: p.divider,
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
              <Code size={16} color={accent} />
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
              borderRadius: radius,
                            paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: cardBg,
            }}
          >
            <View
              style={{
                height: 48,
                width: 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: accentSoft,
              }}
            >
              <Globe size={26} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: "ClashDisplay-Bold", color: textPrimary }}>
                Instagram
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Outfit", marginTop: 2, color: labelColor }}>
                @ph.perform — updates, drills, and community
              </Text>
            </View>
            <ChevronLeft
              size={17}
              color={p.textMuted}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
          </View>
        </Pressable>

        {/* Primary CTA */}
        <Pressable onPress={() => void Linking.openURL(siteUrl)}>
          <View
            style={{
              height: 56,
              borderRadius: radius,
              backgroundColor: accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Globe size={20} color="#fff" />
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

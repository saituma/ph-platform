import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import * as SecureStore from "expo-secure-store";
import { Text } from "@/components/ScaledText";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const { token } = useAppSelector((state) => state.user);
  const [privacyContent, setPrivacyContent] = useState<string | null>(null);
  const [privacyVersion, setPrivacyVersion] = useState<string | null>(null);
  const [privacyUpdatedAt, setPrivacyUpdatedAt] = useState<string | null>(null);

  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const textBody = isDark ? "hsl(220, 5%, 60%)" : "hsl(220, 5%, 42%)";
  const headingColor = isDark ? "hsl(220,5%,90%)" : "hsl(220,8%,12%)";
  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";

  const cacheKeys = useMemo(
    () => ({
      body: "legal_privacy_body",
      version: "legal_privacy_version",
      updatedAt: "legal_privacy_updatedAt",
    }),
    []
  );
  const fallbackContent = useMemo(
    () =>
      [
        "1. Data We Collect",
        "We collect account information (such as name and email) and usage data needed to provide coaching features. During runs, we collect foreground location data to track distance, pace, and your GPS trail.",
        "",
        "2. Background Location During Runs",
        "If you enable locked-phone tracking during an active run, the app may collect location in the background so your run continues to track when the app is closed or your phone is locked. Location is only collected during an active run session that you start manually.",
        "",
        "3. Suggested Routes (OSRM)",
        "If you enable Suggested Route, the app sends your start/destination location to a routing provider (OSRM) to calculate and display a suggested route. You can keep the live GPS trail without enabling this feature.",
        "",
        "4. Video Previews",
        "If you paste a YouTube or Loom link, the app may contact those services to fetch preview metadata (oEmbed).",
        "",
        "5. Storage & Security",
        "We implement industry-standard security measures to protect your data. Sensitive tokens are stored securely on your device.",
        "",
        "6. Your Rights",
        "You can access, correct, or delete your personal data through the Privacy & Security settings or by contacting support.",
        "",
        "7. Policy Updates",
        "We may update this policy occasionally. Continued use of the app after changes constitutes acceptance of the updated policy.",
      ].join("\n"),
    []
  );

  useEffect(() => {
    let active = true;
    const loadLegal = async () => {
      try {
        const [cachedBody, cachedVersion, cachedUpdatedAt] = await Promise.all([
          SecureStore.getItemAsync(cacheKeys.body),
          SecureStore.getItemAsync(cacheKeys.version),
          SecureStore.getItemAsync(cacheKeys.updatedAt),
        ]);
        if (active) {
          if (cachedBody) setPrivacyContent(cachedBody);
          if (cachedVersion) setPrivacyVersion(cachedVersion);
          if (cachedUpdatedAt) setPrivacyUpdatedAt(cachedUpdatedAt);
        }
      } catch {
        // ignore cache read failures
      }
      try {
        const endpoint = token ? "/content/legal" : "/content/legal/public";
        const response = await apiRequest<{ items?: any[] }>(endpoint, { token, suppressStatusCodes: [401, 403] });
        if (!active) return;
        const items = response.items ?? [];
        const privacy =
          items.find((item: any) => String(item.category ?? "").toLowerCase() === "privacy") ||
          items.find((item: any) => String(item.title ?? "").toLowerCase().includes("privacy"));
        setPrivacyContent(privacy?.body ?? null);
        setPrivacyVersion(privacy?.content ?? null);
        setPrivacyUpdatedAt(privacy?.updatedAt ?? null);
        try {
          if (privacy?.body) await SecureStore.setItemAsync(cacheKeys.body, privacy.body);
          if (privacy?.content) await SecureStore.setItemAsync(cacheKeys.version, privacy.content);
          if (privacy?.updatedAt) await SecureStore.setItemAsync(cacheKeys.updatedAt, privacy.updatedAt);
        } catch {
          // ignore cache write failures
        }
      } catch {
        if (!active) return;
        setPrivacyContent(null);
        setPrivacyVersion(null);
        setPrivacyUpdatedAt(null);
      }
    };
    loadLegal();
    return () => {
      active = false;
    };
  }, [cacheKeys, token]);

  const handleBack = () => {
    if (params.from) {
      router.navigate(params.from as any);
    } else {
      router.replace("/(tabs)/more");
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <MoreStackHeader
        title="Privacy Policy"
        subtitle="Understand how your account data is handled, protected, and updated across the platform."
        badge="Legal"
        onBack={handleBack}
      />

      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View style={{ height: 24, width: 6, borderRadius: 99, backgroundColor: colors.accent }} />
            <Text style={{ fontSize: 28, fontFamily: "TelmaBold", color: textPrimary }}>
              Data Protection
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit", color: labelColor, marginTop: 4 }}>
            {privacyUpdatedAt
              ? `Updated: ${new Date(privacyUpdatedAt).toLocaleDateString()}`
              : privacyVersion
                ? `Version: ${privacyVersion}`
                : "Version: 1.0"}
          </Text>
        </View>

        <View style={{ gap: 24 }}>
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: cardBorder,
              padding: 20,
            }}
          >
            <MarkdownText
              text={(privacyContent && privacyContent.trim().length ? privacyContent : fallbackContent).trim()}
              baseStyle={{ fontSize: 15, lineHeight: 24, color: textBody }}
              headingStyle={{ fontSize: 20, lineHeight: 28, color: headingColor, fontWeight: "700" }}
              subheadingStyle={{ fontSize: 18, lineHeight: 26, color: headingColor, fontWeight: "700" }}
              listItemStyle={{ paddingLeft: 6 }}
            />
          </View>
        </View>

        <View style={{ marginTop: 48 }}>
          <ActionButton
            label="I Understand"
            onPress={handleBack}
            color="bg-secondary"
            icon="check"
            fullWidth={true}
          />
        </View>
      </ThemedScrollView>
    </View>
  );
}

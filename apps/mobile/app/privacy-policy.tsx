import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import * as SecureStore from "expo-secure-store";
import { Text } from "@/components/ScaledText";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const params = useLocalSearchParams<{ from?: string }>();
  const { token } = useAppSelector((state) => state.user);
  const [privacyContent, setPrivacyContent] = useState<string | null>(null);
  const [privacyVersion, setPrivacyVersion] = useState<string | null>(null);
  const [privacyUpdatedAt, setPrivacyUpdatedAt] = useState<string | null>(null);
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
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
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
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-telma-bold text-app">
              Data Protection
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary mt-1">
            {privacyUpdatedAt
              ? `Updated: ${new Date(privacyUpdatedAt).toLocaleDateString()}`
              : privacyVersion
                ? `Version: ${privacyVersion}`
                : "Version: 1.0"}
          </Text>
        </View>

        <View className="gap-6">
          <View
            className="bg-input rounded-[28px] border border-app p-5"
            style={
              isDark
                ? undefined
                : {
                    shadowColor: "#0F172A",
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 6,
                  }
            }
          >
            <MarkdownText
              text={(privacyContent && privacyContent.trim().length ? privacyContent : fallbackContent).trim()}
              baseStyle={{ fontSize: 16, lineHeight: 24, color: "#64748B" }}
              headingStyle={{ fontSize: 20, lineHeight: 28, color: "#0F172A", fontWeight: "700" }}
              subheadingStyle={{ fontSize: 18, lineHeight: 26, color: "#0F172A", fontWeight: "700" }}
              listItemStyle={{ paddingLeft: 6 }}
            />
          </View>
        </View>

        <View className="mt-12">
          <ActionButton
            label="I Understand"
            onPress={handleBack}
            color="bg-secondary"
            icon="check"
            fullWidth={true}
          />
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

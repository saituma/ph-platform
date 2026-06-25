import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "@/components/ScaledText";
import { Check } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

type LegalContent = {
  body: string | null;
  version: string | null;
  updatedAt: string | null;
};

const CACHE_KEYS = {
  body: "legal_privacy_body",
  version: "legal_privacy_version",
  updatedAt: "legal_privacy_updatedAt",
} as const;

const FALLBACK_CONTENT = [
  "1. Data We Collect",
  "We collect account information (such as name and email) and usage data needed to provide coaching features. During runs, we collect foreground location data to track distance, pace, and your GPS trail. For minor athletes, all accounts are created and managed by a parent or guardian, who provides consent for data collection on the minor's behalf.",
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
  "5. Crash Reporting (Sentry)",
  "The app uses Sentry, a third-party crash reporting service, to collect diagnostic data (crash reports, error logs, device type, and app version) when the app encounters an error. This data is linked to your User ID and is used solely to identify and fix bugs. It is not used for advertising or profiling. Sentry's privacy policy is available at sentry.io/privacy.",
  "",
  "6. Data Retention",
  "We retain your account data for as long as your account is active. You can request deletion at any time through Privacy & Security settings. Anonymised training history may be retained for records after account closure.",
  "",
  "7. Storage & Security",
  "We implement industry-standard security measures to protect your data. Sensitive tokens are stored securely on your device using encrypted storage.",
  "",
  "8. Your Rights",
  "You can access, correct, or delete your personal data through the Privacy & Security settings or by contacting support at support@phperformance.uk.",
  "",
  "9. Policy Updates",
  "We may update this policy occasionally. Continued use of the app after changes constitutes acceptance of the updated policy.",
].join("\n");

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { token } = useAppSelector((state) => state.user);
  const authed = !!token;

  const [cachedData, setCachedData] = useState<LegalContent | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CACHE_KEYS.body),
      AsyncStorage.getItem(CACHE_KEYS.version),
      AsyncStorage.getItem(CACHE_KEYS.updatedAt),
    ]).then(([body, version, updatedAt]) => {
      if (body) setCachedData({ body, version, updatedAt });
    }).catch(() => {});
  }, []);

  const { data } = useQuery({
    queryKey: queryKeys.legal.privacy(authed),
    queryFn: async (): Promise<LegalContent> => {
      const endpoint = authed ? "/content/legal" : "/content/legal/public";
      const response = await apiRequest<{ items?: any[] }>(endpoint, {
        token,
        suppressStatusCodes: [401, 403],
      });
      const items = response.items ?? [];
      const privacy =
        items.find((item: any) => String(item.category ?? "").toLowerCase() === "privacy") ||
        items.find((item: any) => String(item.title ?? "").toLowerCase().includes("privacy"));
      const result: LegalContent = {
        body: privacy?.body ?? null,
        version: privacy?.content ?? null,
        updatedAt: privacy?.updatedAt ?? null,
      };
      try {
        if (result.body) await AsyncStorage.setItem(CACHE_KEYS.body, result.body);
        if (result.version) await AsyncStorage.setItem(CACHE_KEYS.version, result.version);
        if (result.updatedAt) await AsyncStorage.setItem(CACHE_KEYS.updatedAt, result.updatedAt);
      } catch {}
      return result;
    },
    placeholderData: cachedData ?? undefined,
    staleTime: 1000 * 60 * 10,
  });

  const privacyContent = data?.body ?? cachedData?.body ?? null;
  const privacyVersion = data?.version ?? cachedData?.version ?? null;
  const privacyUpdatedAt = data?.updatedAt ?? cachedData?.updatedAt ?? null;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/more");
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: p.pageBg }}>
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
            <View style={{ height: 24, width: 6, borderRadius: 99, backgroundColor: p.accent }} />
            <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
              Data Protection
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
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
              backgroundColor: p.cardWhite,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <MarkdownText
              text={(privacyContent && privacyContent.trim().length ? privacyContent : FALLBACK_CONTENT).trim()}
              baseStyle={{ fontSize: 15, lineHeight: 24, color: p.textSecondary }}
              headingStyle={{ fontSize: 20, lineHeight: 28, color: p.textPrimary, fontWeight: "700" }}
              subheadingStyle={{ fontSize: 18, lineHeight: 26, color: p.textPrimary, fontWeight: "700" }}
              listItemStyle={{ paddingLeft: 6 }}
            />
          </View>
        </View>

        <Pressable onPress={handleBack} style={{ marginTop: 48 }}>
          <View
            style={{
              height: 56,
              borderRadius: 100,
              backgroundColor: p.accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Check size={20} color={p.buttonPrimaryText} />
            <Text style={{ color: p.buttonPrimaryText, fontFamily: "Outfit-Bold", fontSize: 16 }}>
              I Understand
            </Text>
          </View>
        </Pressable>
      </ThemedScrollView>
    </View>
  );
}

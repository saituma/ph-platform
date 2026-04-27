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

export default function TermsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const { token } = useAppSelector((state) => state.user);
  const [termsContent, setTermsContent] = useState<string | null>(null);
  const [termsVersion, setTermsVersion] = useState<string | null>(null);
  const [termsUpdatedAt, setTermsUpdatedAt] = useState<string | null>(null);

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
      body: "legal_terms_body",
      version: "legal_terms_version",
      updatedAt: "legal_terms_updatedAt",
    }),
    []
  );
  const fallbackContent = useMemo(
    () =>
      [
        "1. Agreement to Terms",
        "By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.",
        "",
        "2. Eligibility",
        "The app is designed for athletes and their guardians. Guardians are responsible for the management of minor accounts and all coaching bookings.",
        "",
        "3. Coaching & Subscriptions",
        "Subscriptions provide access to specific training tiers (PHP, Plus, Premium). Features and availability may vary based on your tier.",
        "",
        "4. Safety & Liability",
        "Physical training involves inherent risks. Users must ensure they are in proper physical condition before proceeding with any training program provided.",
        "",
        "5. Termination",
        "We reserve the right to suspend or terminate accounts that violate our community guidelines or fail to maintain valid subscriptions.",
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
          if (cachedBody) setTermsContent(cachedBody);
          if (cachedVersion) setTermsVersion(cachedVersion);
          if (cachedUpdatedAt) setTermsUpdatedAt(cachedUpdatedAt);
        }
      } catch {
        // ignore cache read failures
      }
      try {
        const endpoint = token ? "/content/legal" : "/content/legal/public";
        const response = await apiRequest<{ items?: any[] }>(endpoint, { token, suppressStatusCodes: [401, 403] });
        if (!active) return;
        const items = response.items ?? [];
        const terms =
          items.find((item: any) => String(item.category ?? "").toLowerCase() === "terms") ||
          items.find((item: any) => String(item.title ?? "").toLowerCase().includes("terms"));
        setTermsContent(terms?.body ?? null);
        setTermsVersion(terms?.content ?? null);
        setTermsUpdatedAt(terms?.updatedAt ?? null);
        try {
          if (terms?.body) await SecureStore.setItemAsync(cacheKeys.body, terms.body);
          if (terms?.content) await SecureStore.setItemAsync(cacheKeys.version, terms.content);
          if (terms?.updatedAt) await SecureStore.setItemAsync(cacheKeys.updatedAt, terms.updatedAt);
        } catch {
          // ignore cache write failures
        }
      } catch {
        if (!active) return;
        setTermsContent(null);
        setTermsVersion(null);
        setTermsUpdatedAt(null);
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
        title="Terms of Service"
        subtitle="Review the product terms, responsibilities, and feature rules in one easy-to-scan legal surface."
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
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 28, fontFamily: "TelmaBold", color: textPrimary, marginBottom: 8 }}>
            Legal Terms
          </Text>
          <Text style={{ fontSize: 15, fontFamily: "Outfit", color: labelColor, marginTop: 4 }}>
            {termsUpdatedAt
              ? `Updated: ${new Date(termsUpdatedAt).toLocaleDateString()}`
              : termsVersion
                ? `Version: ${termsVersion}`
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
              text={(termsContent && termsContent.trim().length ? termsContent : fallbackContent).trim()}
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
            onPress={() => router.replace("/(tabs)/more")}
            color="bg-secondary"
            icon="check"
            fullWidth={true}
          />
        </View>
      </ThemedScrollView>
    </View>
  );
}

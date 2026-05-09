import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import * as SecureStore from "expo-secure-store";
import { Text } from "@/components/ScaledText";
import { Check } from "lucide-react-native";

export default function TermsScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const { token } = useAppSelector((state) => state.user);
  const [termsContent, setTermsContent] = useState<string | null>(null);
  const [termsVersion, setTermsVersion] = useState<string | null>(null);
  const [termsUpdatedAt, setTermsUpdatedAt] = useState<string | null>(null);

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
        "3. Coaching & Access",
        "Access to specific features and programmes is managed by your coaching team. Contact your coach or visit phperformance.uk for information about available programmes.",
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
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: p.pageBg }}>
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
          <Text style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8 }}>
            Legal Terms
          </Text>
          <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
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
              backgroundColor: p.cardWhite,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <MarkdownText
              text={(termsContent && termsContent.trim().length ? termsContent : fallbackContent).trim()}
              baseStyle={{ fontSize: 15, lineHeight: 24, color: p.textSecondary }}
              headingStyle={{ fontSize: 20, lineHeight: 28, color: p.textPrimary, fontWeight: "700" }}
              subheadingStyle={{ fontSize: 18, lineHeight: 26, color: p.textPrimary, fontWeight: "700" }}
              listItemStyle={{ paddingLeft: 6 }}
            />
          </View>
        </View>

        <Pressable onPress={() => router.replace("/(tabs)/more")} style={{ marginTop: 48 }}>
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

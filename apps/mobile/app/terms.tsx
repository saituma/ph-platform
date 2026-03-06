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
import * as SecureStore from "expo-secure-store";
import { Text } from "@/components/ScaledText";

export default function TermsScreen() {
  const router = useRouter();
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
        "3. Coaching & Subscriptions",
        "Subscriptions provide access to specific training tiers (PHP, Plus, Premium). Features and availability may vary based on your selected plan.",
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
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
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
        <View className="mb-8">
          <Text className="text-3xl font-clash text-app mb-2">Legal Terms</Text>
          <Text className="text-base font-outfit text-secondary mt-1">
            {termsUpdatedAt
              ? `Updated: ${new Date(termsUpdatedAt).toLocaleDateString()}`
              : termsVersion
                ? `Version: ${termsVersion}`
                : "Version: 1.0"}
          </Text>
        </View>

        <View className="gap-6">
          <MarkdownText
            text={(termsContent && termsContent.trim().length ? termsContent : fallbackContent).trim()}
            baseStyle={{ fontSize: 16, lineHeight: 24, color: "#64748B" }}
            headingStyle={{ fontSize: 20, lineHeight: 28, color: "#0F172A", fontWeight: "700" }}
            subheadingStyle={{ fontSize: 18, lineHeight: 26, color: "#0F172A", fontWeight: "700" }}
            listItemStyle={{ paddingLeft: 6 }}
          />
        </View>

        <View className="mt-12">
          <ActionButton
            label="I Understand"
            onPress={() => router.replace("/(tabs)/more")}
            color="bg-secondary"
            icon="check"
            fullWidth={true}
          />
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

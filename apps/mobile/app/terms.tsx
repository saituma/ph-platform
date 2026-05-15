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
        "## 1. Agreement to Terms",
        "",
        "By accessing or using the PH Performance application, you agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree to these terms, please do not use the app. These terms form a legally binding agreement between you and Lift Lab Ltd, the company behind PH Performance.",
        "",
        "## 2. Eligibility & Parental Consent",
        "",
        "PH Performance is designed for athletes of all ages and their parents or guardians. All accounts for minor athletes are created and actively managed by a parent or guardian — minors do not independently create their own accounts. By creating an account on behalf of a minor, the parent or guardian explicitly consents to the collection and use of the minor's data as described in our Privacy Policy. Guardians are fully responsible for all activity on accounts they manage, including monitoring communications, content, and coaching interactions. Adult athletes aged 18 and over may create and manage their own accounts directly.",
        "",
        "## 3. Account Responsibilities",
        "",
        "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at support@phperformance.uk if you suspect unauthorised use of your account. You may not share your account with others or transfer it to another person. Each athlete or guardian must have their own account.",
        "",
        "## 4. Coaching & Programme Access",
        "",
        "Access to specific training programmes, sessions, and features is managed by your coaching team and determined by your subscription plan. Programmes are assigned by coaches and administrators — athletes access only the content their coach has assigned to them. Schedule bookings, session feedback, and progress tracking are all subject to your coach's oversight. Contact your coach or visit phperformance.uk for information about available programmes and plan upgrades.",
        "",
        "## 5. User-Generated Content",
        "",
        "The app allows users to send messages, share media files, submit testimonials, and communicate with coaches and teammates. By submitting any content, you grant Lift Lab Ltd a non-exclusive licence to store, display, and use that content to operate the platform. You retain ownership of your content. You are solely responsible for all content you submit and must ensure it complies with our Community Guidelines. Testimonials submitted through the app are reviewed by our team before publication.",
        "",
        "## 6. Safety & Physical Activity",
        "",
        "Physical training involves inherent risks of injury. By using PH Performance, you acknowledge these risks and confirm that you (or the minor in your care) are in appropriate physical condition to participate in the training programmes provided. Always consult a qualified medical professional before beginning any new training programme, particularly if you have an existing medical condition or injury. PH Performance, its coaches, and Lift Lab Ltd accept no liability for injuries sustained during training activities.",
        "",
        "## 7. Run Tracking & Location",
        "",
        "The run tracking feature uses GPS to record your route, pace, and distance. Location data is collected only during active run sessions that you manually start. If you enable locked-phone tracking, background location may be used so your run continues to record when the screen locks. You can stop location collection at any time by ending the run session. See our Privacy Policy for full details on how location data is stored and used.",
        "",
        "## 8. Privacy & Data",
        "",
        "Your use of PH Performance is also governed by our Privacy Policy, which is incorporated into these Terms by reference. We collect and process personal data in accordance with the UK GDPR and applicable data protection legislation. You have the right to access, correct, and delete your personal data at any time through the Privacy & Security settings in the app.",
        "",
        "## 9. Intellectual Property",
        "",
        "All content on the platform created by PH Performance coaches and staff — including training programmes, exercise libraries, coaching materials, videos, and methodology — is the intellectual property of Lift Lab Ltd or its licensors. You may not reproduce, distribute, or create derivative works from this content without express written permission.",
        "",
        "## 10. Prohibited Conduct",
        "",
        "You must not use PH Performance to:",
        "- Post, send, or share content that is abusive, harassing, threatening, discriminatory, or sexually explicit",
        "- Bully, intimidate, or harm other users, particularly youth athletes",
        "- Impersonate any person or organisation",
        "- Attempt to gain unauthorised access to other accounts or our systems",
        "- Use the app for any commercial purpose without our written consent",
        "- Violate any applicable law or regulation",
        "",
        "Violations of these prohibitions may result in immediate account suspension and, where appropriate, referral to law enforcement authorities.",
        "",
        "## 11. Account Suspension & Termination",
        "",
        "We reserve the right to suspend or permanently terminate any account that violates these Terms or our Community Guidelines. We will act on reports of abusive behaviour, objectionable content, or guideline violations within 24 hours. You may delete your own account at any time through Privacy & Security settings. Upon account deletion, your login credentials are removed immediately; certain anonymised training data may be retained for operational records.",
        "",
        "## 12. Limitation of Liability",
        "",
        "To the fullest extent permitted by applicable law, Lift Lab Ltd shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of PH Performance. Our total liability for any claim related to the app shall not exceed the amount you paid for the service in the 12 months preceding the claim.",
        "",
        "## 13. Governing Law",
        "",
        "These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.",
        "",
        "## 14. Changes to Terms",
        "",
        "We may update these Terms from time to time. We will notify you of significant changes through the app or by email. Continued use of PH Performance after changes take effect constitutes acceptance of the updated Terms.",
        "",
        "## 15. Contact",
        "",
        "If you have any questions about these Terms, please contact us at support@phperformance.uk or write to: Lift Lab Ltd, United Kingdom.",
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

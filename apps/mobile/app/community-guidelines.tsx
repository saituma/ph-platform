import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { Check } from "lucide-react-native";

const GUIDELINES_CONTENT = [
  "## Our Community",
  "",
  "PH Performance is a coaching platform built for athletes, parents, and coaches who are serious about development. Whether you are a youth footballer working with a coach, an adult athlete tracking your progress, or a team manager organising your squad, you are part of a community built on respect, trust, and hard work.",
  "",
  "These Community Guidelines exist to keep this a safe, supportive environment for everyone — especially young athletes. By using PH Performance, you agree to follow these guidelines at all times.",
  "",
  "## Zero Tolerance Policy",
  "",
  "We have an absolute zero tolerance policy for the following:",
  "",
  "- **Bullying or harassment** of any kind, including targeting another user repeatedly with unwanted messages, insults, or intimidation",
  "- **Abusive language** — threatening, racist, sexist, homophobic, or otherwise discriminatory content",
  "- **Sexual content** — any explicit, suggestive, or inappropriate sexual content, particularly anything involving minors",
  "- **Threats of violence** — any content that threatens harm to another person",
  "- **Exploitation of minors** — any content or behaviour that endangers, exploits, or puts youth athletes at risk",
  "",
  "Violations of this zero tolerance policy will result in **immediate, permanent account removal** and, where appropriate, reports to law enforcement authorities.",
  "",
  "## Respectful Communication",
  "",
  "All communication on PH Performance — messages, feedback, testimonials, and comments — must be respectful and constructive. This means:",
  "",
  "- Speak to coaches, teammates, and other users the way you would want to be spoken to",
  "- Keep feedback focused on performance and development, not personal attacks",
  "- Do not use the messaging system to spread rumours, gossip, or misinformation about other users",
  "- Do not engage in arguments or confrontations — if you have a dispute, contact your coach or our support team",
  "- Be patient and understanding — users include young athletes who may be less experienced",
  "",
  "## Appropriate Content in Messages & Media",
  "",
  "When sharing files, images, or videos through the platform:",
  "",
  "- Only share training-related content — videos of drills, match clips, progress photos, and coaching materials",
  "- Do not share content that is violent, graphic, offensive, or unrelated to coaching and athletic development",
  "- Do not share personal information (home addresses, phone numbers, financial details) of yourself or others",
  "- Do not use the platform to share copyrighted material you do not have the right to distribute",
  "",
  "Our team may remove content that violates these standards without prior notice.",
  "",
  "## Protecting Youth Athletes",
  "",
  "The safety of young athletes is our highest priority. All interactions involving youth athletes are monitored by their parent or guardian, who manages the athlete's account. Coaches and staff communicate with youth athletes through official coaching threads only.",
  "",
  "If you are a coach or team manager:",
  "- Keep all communication professional and coaching-focused",
  "- Do not request personal contact details from athletes or their families outside the platform",
  "- Report any safeguarding concerns immediately to support@phperformance.uk",
  "",
  "If you are a parent or guardian:",
  "- Review your athlete's messages and interactions regularly",
  "- Use the block and report features if you encounter any inappropriate contact",
  "- Contact us immediately at support@phperformance.uk with any concerns about your child's safety",
  "",
  "## How to Report Violations",
  "",
  "If you see content or behaviour that violates these guidelines:",
  "",
  "**In messages:** Long-press any message → select Report → choose a reason (Harassment, Inappropriate content, Spam, or Other) → submit. Our team receives the report immediately.",
  "",
  "**Block a user:** Long-press any message → select Block. The user's messages are removed from your view instantly and they can no longer contact you.",
  "",
  "**Contact support directly:** Email support@phperformance.uk with details of the issue. Include screenshots where possible.",
  "",
  "We commit to reviewing all reports within 24 hours and taking action — including content removal and account suspension — within that timeframe.",
  "",
  "## Blocking Users",
  "",
  "You have the right to block any user who makes you feel unsafe or uncomfortable. When you block someone:",
  "",
  "- Their messages are removed from your conversation immediately",
  "- They can no longer send you messages",
  "- The block is reported to our moderation team so we can review the account",
  "",
  "Blocking is always anonymous — the other person is not told they have been blocked.",
  "",
  "## Content Moderation",
  "",
  "PH Performance uses a combination of user reporting and admin review to moderate content:",
  "",
  "- Testimonials submitted by users are reviewed by our team before they appear publicly",
  "- Reported messages are reviewed within 24 hours",
  "- Accounts that repeatedly violate these guidelines are escalated for permanent suspension",
  "- We reserve the right to remove any content that we determine, at our sole discretion, is harmful, inappropriate, or inconsistent with the purpose of the platform",
  "",
  "## Consequences for Violations",
  "",
  "Depending on the severity and frequency of a violation, consequences include:",
  "",
  "- **Warning:** A formal notice that your behaviour violates our guidelines",
  "- **Content removal:** The specific message, post, or file is deleted",
  "- **Temporary suspension:** Access to the platform is restricted for a period",
  "- **Permanent ban:** Account permanently closed with no refund of any remaining subscription",
  "- **Legal referral:** In serious cases involving threats, exploitation, or criminal activity, we will refer the matter to the appropriate authorities",
  "",
  "## Contact Us",
  "",
  "If you have questions about these guidelines, need to report a safeguarding concern, or want to appeal a moderation decision, contact us at:",
  "",
  "**Email:** support@phperformance.uk",
  "**Website:** phperformance.uk",
  "",
  "We are committed to making PH Performance a safe and positive environment for every athlete, parent, and coach on the platform.",
].join("\n");

export default function CommunityGuidelinesScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/more" as any);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: p.pageBg }}>
      <MoreStackHeader
        title="Community Guidelines"
        subtitle="The standards we hold every athlete, parent, and coach to on this platform."
        badge="Community"
        onBack={handleBack}
      />

      <ThemedScrollView
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
              Community Standards
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
            Version 1.0 — Effective May 2026
          </Text>
        </View>

        <View
          style={{
            backgroundColor: p.cardWhite,
            borderRadius: 20,
            padding: 20,
            marginBottom: 32,
          }}
        >
          <MarkdownText
            text={GUIDELINES_CONTENT}
            baseStyle={{ fontSize: 15, lineHeight: 24, color: p.textSecondary }}
            headingStyle={{ fontSize: 20, lineHeight: 28, color: p.textPrimary, fontWeight: "700" }}
            subheadingStyle={{ fontSize: 18, lineHeight: 26, color: p.textPrimary, fontWeight: "700" }}
            listItemStyle={{ paddingLeft: 6 }}
          />
        </View>

        <Pressable onPress={handleBack}>
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

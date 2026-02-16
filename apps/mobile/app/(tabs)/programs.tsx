import { ProgramCard, ProgramTier } from "@/components/ProgramCard";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { buildPlanPricing, PlanPricing } from "@/lib/billing";
import { useAppSelector } from "@/store/hooks";
import { normalizeProgramTier, programIdToTier } from "@/lib/planAccess";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgramsScreen() {
  const router = useRouter();
  const { onboardingCompleted, token, isAuthenticated, programTier, latestSubscriptionRequest } = useAppSelector(
    (state) => state.user
  );
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [plansByTier, setPlansByTier] = useState<Record<string, number>>({});
  const [pricingByTier, setPricingByTier] = useState<Record<string, PlanPricing>>({});

  const tiers = useMemo<ProgramTier[]>(
    () => [
      {
        id: "php",
        name: "PHP Program",
        description: "Structured weekly sessions for developing athletes.",
        features: [
          "Age-appropriate training plan",
          "Weekly session guidance",
          "Warm-up & cooldown included",
          "Coach notes & video cues",
        ],
        color: "bg-[#0E7490]",
        icon: "activity",
      },
      {
        id: "plus",
        name: "PHP Plus",
        description: "Extra education, nutrition, and off-season support.",
        features: [
          "Everything in PHP Program",
          "Parent education & nutrition",
          "Stretching & foam rolling",
          "Off-season program access",
        ],
        color: "bg-[#1D4ED8]",
        icon: "layers",
      },
      {
        id: "premium",
        name: "PHP Premium (1:1)",
        description: "Fully individualized coaching with priority support.",
        features: [
          "Personalized programming",
          "Priority messaging",
          "Video feedback & reviews",
          "Role model meeting bookings",
        ],
        color: "bg-[#7C3AED]",
        icon: "star",
        highlight: "Limited availability",
      },
    ],
    []
  );

  const handleViewProgram = (tierId: string) => {
    router.push(`/programs/${tierId}`);
  };

  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated || !token) {
      setCurrentTier(null);
      return;
    }
    (async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

        let plansResponse: { plans: any[] } | null = null;
        const plansRes = await fetch(`${baseUrl}/public/plans`);
        if (plansRes.ok) {
          plansResponse = await plansRes.json();
        }

        if (!mounted) return;
        setCurrentTier(programTier ?? null);
        const map: Record<string, number> = {};
        const pricingMap: Record<string, PlanPricing> = {};
        (plansResponse?.plans ?? []).forEach((plan) => {
          if (plan?.tier && plan?.id) {
            map[plan.tier] = plan.id;
            pricingMap[plan.tier] = buildPlanPricing(plan);
          }
        });
        setPlansByTier(map);
        setPricingByTier(pricingMap);
      } catch {
        // Ignore - UI will still render.
      } finally {
        // no-op
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, programTier, isAuthenticated]);

  const handleApply = async (tierId: string) => {
    if (!onboardingCompleted) {
      router.push("/(tabs)/onboarding");
      return;
    }
    if (!token) {
      Alert.alert("Login required", "Please log in as a guardian to purchase a plan.");
      router.replace("/(auth)/login");
      return;
    }
    const tierMap: Record<string, string> = {
      php: "PHP",
      plus: "PHP_Plus",
      premium: "PHP_Premium",
    };
    const planId = plansByTier[tierMap[tierId]];
    if (!planId) {
      router.push("/plans");
      return;
    }
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
      const selectedPricing = pricingByTier[tierMap[tierId]];
      const selectedPlanId = planId;
      const launchPayment = async (interval?: "monthly" | "yearly") => {
        const res = await fetch(`${baseUrl}/billing/payment-sheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: selectedPlanId, interval }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Checkout unavailable");
        }
        const data = await res.json();
        const init = await initPaymentSheet({
          merchantDisplayName: "PH Platform",
          customerId: data.customerId,
          customerEphemeralKeySecret: data.ephemeralKey,
          paymentIntentClientSecret: data.paymentIntentClientSecret,
          allowsDelayedPaymentMethods: true,
        });
        if (init.error) {
          throw new Error(init.error.message);
        }
        const result = await presentPaymentSheet();
        if (result.error) {
          throw new Error(result.error.message);
        }
        await fetch(`${baseUrl}/billing/payment-sheet/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentIntentId: data.paymentIntentId }),
        });
        Alert.alert("Payment complete", "Your request is pending approval.");
      };

      if (selectedPricing?.lines?.length && selectedPricing.lines.length >= 2) {
        Alert.alert("Choose billing", "Select a billing interval", [
          { text: "Monthly", onPress: () => launchPayment("monthly") },
          { text: "Yearly", onPress: () => launchPayment("yearly") },
          { text: "Cancel", style: "cancel" },
        ]);
      } else {
        await launchPayment();
      }
    } catch (error: any) {
      const message = error?.message ?? "Please try again.";
      if (typeof message === "string" && message.includes("403")) {
        Alert.alert("Guardian only", "Only guardian accounts can purchase plans.");
        return;
      }
      Alert.alert("Checkout failed", message);
    } finally {
      // no-op
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
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
          <Text className="text-4xl font-clash text-app mb-2">Programs</Text>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Choose the level of coaching that fits your athlete{"'"}s goals.
          </Text>
        </View>

        {tiers.map((tier) => {
          const requiredTier = programIdToTier(tier.id as "php" | "plus" | "premium");
          const normalizedTier = normalizeProgramTier(currentTier);
          const isTierEnrolled = normalizedTier === requiredTier;
          const isPendingRequest =
            !isTierEnrolled &&
            latestSubscriptionRequest?.planTier === requiredTier &&
            ["pending_payment", "pending_approval"].includes(
              String(latestSubscriptionRequest?.status ?? "")
            );
          const pricing = pricingByTier[requiredTier];
          const primaryLabel = isTierEnrolled
            ? "View Program"
            : tier.id === "premium"
              ? "Apply"
              : "Onboard";
          return (
            <ProgramCard
              key={tier.id}
              tier={{
                ...tier,
                priceBadge: pricing?.badge,
                priceLines: pricing?.lines,
                discountNote: pricing?.discountNote,
                highlight: isPendingRequest ? "Pending Approval" : tier.highlight,
              }}
              primaryLabel={primaryLabel}
              secondaryLabel="View Details"
            helperNote={
              isPendingRequest
                ? "Your request is pending coach approval."
                : tier.id === "premium"
                  ? "1:1 spots are limited. Apply to join the waitlist."
                  : undefined
            }
            onPrimaryPress={() => {
              if (isTierEnrolled) {
                handleViewProgram(tier.id);
                return;
              }
              if (isPendingRequest) {
                Alert.alert("Pending approval", "Your request is awaiting coach approval.");
                return;
              }
              handleApply(tier.id);
            }}
              onSecondaryPress={() => handleViewProgram(tier.id)}
            />
          );
        })}
      </ThemedScrollView>
    </SafeAreaView>
  );
}

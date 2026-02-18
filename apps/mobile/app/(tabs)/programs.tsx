import { ProgramCard, ProgramTier } from "@/components/ProgramCard";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { buildPlanPricing, PlanPricing } from "@/lib/billing";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { normalizeProgramTier, programIdToTier } from "@/lib/planAccess";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, View } from "react-native";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { setLatestSubscriptionRequest, setProgramTier } from "@/store/slices/userSlice";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

export default function ProgramsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { onboardingCompleted, token, isAuthenticated, programTier, latestSubscriptionRequest } = useAppSelector(
    (state) => state.user
  );
  const { isSectionHidden } = useAgeExperience();
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
        color: "bg-[#2F8F57]",
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
        color: "bg-[#2B7E4F]",
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
        color: "bg-[#256B44]",
        icon: "star",
        highlight: "Limited availability",
      },
    ],
    []
  );

  const handleViewProgram = (tierId: string) => {
    router.push(`/programs/${tierId}`);
  };

  if (isSectionHidden("programs")) {
    return <AgeGate title="Programs locked" message="Programs are restricted for this age." />;
  }

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

  useFocusEffect(
    React.useCallback(() => {
      if (!token) return;
      refreshBillingStatus();
    }, [token])
  );

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

  const refreshBillingStatus = async () => {
    if (!token) return;
    try {
      const status = await apiRequest<{
        currentProgramTier?: string | null;
        latestRequest?: {
          status?: string | null;
          paymentStatus?: string | null;
          planTier?: string | null;
          createdAt?: string | null;
        } | null;
      }>("/billing/status", {
        token,
        suppressStatusCodes: [401, 403, 404],
      });
      const nextRequestStatus = status?.latestRequest?.status ?? null;
      const nextTier =
        status?.currentProgramTier ??
        (nextRequestStatus === "approved" ? status?.latestRequest?.planTier ?? null : null);
      dispatch(setProgramTier(nextTier ?? null));
      dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
      setCurrentTier(nextTier ?? null);
    } catch {
      // no-op
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        onRefresh={refreshBillingStatus}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="mb-8">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-10 w-1.5 rounded-full bg-[#2F8F57]" />
            <View>
              <Text className="text-4xl font-clash text-[#0E1510] dark:text-[#F2F6F2]">
                Programs
              </Text>
              <Text className="text-xs font-outfit text-[#1D2A22] dark:text-[#D8E6D8] uppercase tracking-[2px]">
                Plan access updates live
              </Text>
            </View>
          </View>
          <Text className="text-base font-outfit text-[#1D2A22] dark:text-[#D8E6D8] leading-relaxed">
            Choose the level of coaching that fits your athlete{"'"}s goals.
          </Text>
        </View>

        {tiers.map((tier) => {
          const requiredTier = programIdToTier(tier.id as "php" | "plus" | "premium");
          const normalizedTier = normalizeProgramTier(currentTier);
          const isTierEnrolled = normalizedTier === requiredTier;
          const requestStatus = String(latestSubscriptionRequest?.status ?? "");
          const isPendingApproval =
            !isTierEnrolled &&
            latestSubscriptionRequest?.planTier === requiredTier &&
            requestStatus === "pending_approval";
          const isPendingPayment =
            !isTierEnrolled &&
            latestSubscriptionRequest?.planTier === requiredTier &&
            requestStatus === "pending_payment";
          const pricing = pricingByTier[requiredTier];
          const primaryLabel = isTierEnrolled
            ? "View Program"
            : isPendingApproval
              ? "Waiting Approval"
              : isPendingPayment
                ? "Complete Payment"
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
                highlight: isPendingApproval ? "Pending Approval" : tier.highlight,
              }}
              primaryLabel={primaryLabel}
              secondaryLabel="View Details"
            helperNote={
              isPendingApproval
                ? "Your request is awaiting coach approval."
                : isPendingPayment
                  ? "Finish checkout to submit for approval."
                  : tier.id === "premium"
                  ? "1:1 spots are limited. Apply to join the waitlist."
                  : undefined
            }
            onPrimaryPress={() => {
              if (isTierEnrolled) {
                handleViewProgram(tier.id);
                return;
              }
              if (isPendingApproval) {
                Alert.alert("Pending approval", "Your request is awaiting coach approval.");
                return;
              }
              if (isPendingPayment) {
                Alert.alert("Payment required", "Complete payment to submit your request.");
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

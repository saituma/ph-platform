import { ProgramTier } from "@/components/ProgramCard";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { normalizeProgramTier } from "@/lib/planAccess";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import {
  setLatestSubscriptionRequest,
  setProgramTier,
} from "@/store/slices/userSlice";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { Ionicons } from "@expo/vector-icons";
import { buildPlanPricing, PlanPricing } from "@/lib/billing";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";

export default function ProgramsScreen() {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const {
    token,
    programTier,
    latestSubscriptionRequest,
  } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();

  const [selectedTierId, setSelectedTierId] = useState<"php" | "plus" | "premium" | null>(null);
  const [plansByTier, setPlansByTier] = useState<Record<string, number>>({});
  const [planDetailsByTier, setPlanDetailsByTier] = useState<Record<string, any>>({});
  const [pricingByTier, setPricingByTier] = useState<Record<string, PlanPricing>>({});

  const tiers = useMemo<ProgramTier[]>(
    () => [
      {
        id: "php",
        name: "PHP Program",
        description: "Weekly structured training for developing athletes.",
        features: [
          "Age-appropriate training plan",
          "Weekly session guidance",
          "Warm-up & cooldown included",
          "Coach notes & video cues",
        ],
        color: "bg-[#2F8F57]",
        icon: "activity",
        popular: false,
      },
      {
        id: "plus",
        name: "PHP Plus",
        description: "Enhanced support with nutrition and off-season guidance.",
        features: [
          "Everything in PHP Program",
          "Parent education & nutrition guidance",
          "Stretching & mobility routines",
          "Off-season program access",
        ],
        color: "bg-[#2B7E4F]",
        icon: "layers",
        popular: true,
      },
      {
        id: "premium",
        name: "PHP Premium",
        description: "Fully personalized 1:1 coaching experience.",
        features: [
          "Personalized programming & adjustments",
          "Priority coach messaging",
          "Video analysis & detailed feedback",
          "1:1 role model meetings",
        ],
        color: "bg-[#256B44]",
        icon: "star",
        highlight: "Limited spots",
        popular: false,
      },
    ],
    [],
  );


  if (isSectionHidden("programs")) {
    return (
      <AgeGate
        title="Programs locked"
        message="Programs are restricted for this age."
      />
    );
  }

  const refreshBillingStatus = useCallback(async () => {
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
    } catch {
      // no-op
    }
  }, [dispatch, token]);

  const handleApply = useCallback(
    async (tierId: "php" | "plus" | "premium", interval?: "monthly" | "yearly") => {
      if (!token) {
        return;
      }
      const requiredTier =
        tierId === "plus" ? "PHP_Plus" : tierId === "premium" ? "PHP_Premium" : "PHP";
      if (requiredTier === "PHP") {
        return;
      }

      const planId = plansByTier[requiredTier];
      const plan = planDetailsByTier[requiredTier];
      if (!planId || !plan) {
        return;
      }

      const startCheckout = async (selectedInterval?: "monthly" | "yearly") => {
        const data = await apiRequest<{
          customerId: string;
          ephemeralKey: string;
          paymentIntentId: string;
          paymentIntentClientSecret: string;
          request?: any;
        }>("/billing/payment-sheet", {
          method: "POST",
          body: { planId, interval: selectedInterval },
          token,
        });

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

        const confirm = await apiRequest<{ paymentStatus?: string; request?: any }>(
          "/billing/payment-sheet/confirm",
          {
            method: "POST",
            body: { paymentIntentId: data.paymentIntentId },
            token,
          },
        );

        dispatch(setLatestSubscriptionRequest(confirm.request ?? data.request ?? null));
      };

      if (interval) {
        await startCheckout(interval);
        return;
      }

      if (plan.billingInterval?.includes("monthly") && plan.billingInterval?.includes("yearly")) {
        await startCheckout("monthly");
        return;
      }

      const defaultInterval = plan.billingInterval?.includes("yearly") ? "yearly" : "monthly";
      await startCheckout(defaultInterval);
    },
    [dispatch, planDetailsByTier, plansByTier, token],
  );

  useEffect(() => {
    if (!token) return;
    refreshBillingStatus();
  }, [refreshBillingStatus, token]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
        const plansRes = await fetch(`${baseUrl}/public/plans`);
        if (!plansRes.ok) return;
        const plansResponse: { plans: any[] } = await plansRes.json();
        if (!mounted) return;
        const map: Record<string, number> = {};
        const detailsMap: Record<string, any> = {};
        const pricingMap: Record<string, PlanPricing> = {};
        (plansResponse?.plans ?? []).forEach((plan) => {
          if (plan?.tier && plan?.id) {
            map[plan.tier] = plan.id;
            detailsMap[plan.tier] = plan;
            pricingMap[plan.tier] = buildPlanPricing(plan);
          }
        });
        setPlansByTier(map);
        setPlanDetailsByTier(detailsMap);
        setPricingByTier(pricingMap);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // If a plan is selected, show its detail view
  if (selectedTierId) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <ProgramDetailPanel
          programId={selectedTierId}
          showBack
          onBack={() => setSelectedTierId(null)}
        />
      </SafeAreaView>
    );
  }

  // Otherwise, show the plan cards
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-6 pb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-6 w-1.5 rounded-full bg-[#2F8F57]" />
            <Text className="text-3xl font-clash text-app">Programs</Text>
          </View>
          <Text className="text-secondary font-outfit text-sm mt-1 ml-5">
            Choose a plan to view your program content
          </Text>
        </View>

        <View className="px-6 gap-5 mt-2">
          {tiers.map((tier) => {
            const requiredTier =
              tier.id === "plus" ? "PHP_Plus" : tier.id === "premium" ? "PHP_Premium" : "PHP";
            const pricing = pricingByTier[requiredTier];
            const plan = planDetailsByTier[requiredTier];
            const hasBothIntervals =
              plan?.billingInterval?.includes("monthly") &&
              plan?.billingInterval?.includes("yearly");
            const monthlyLabel =
              pricing?.lines?.find((line: string) => line.toLowerCase().startsWith("monthly")) ?? "Monthly";
            const yearlyLabel =
              pricing?.lines?.find((line: string) => line.toLowerCase().startsWith("yearly")) ?? "Yearly";
            const isTierEnrolled = normalizeProgramTier(programTier) === requiredTier;
            const requestStatus = String(latestSubscriptionRequest?.status ?? "");
            const isPendingApproval =
              !isTierEnrolled &&
              latestSubscriptionRequest?.planTier === requiredTier &&
              requestStatus === "pending_approval";
            const isPendingPayment =
              !isTierEnrolled &&
              latestSubscriptionRequest?.planTier === requiredTier &&
              requestStatus === "pending_payment";
            const primaryLabel = isTierEnrolled
              ? "Current"
              : isPendingApproval
                ? "Pending"
                : isPendingPayment
                  ? "Pay Now"
                  : tier.id === "premium"
                    ? "Apply"
                    : "Get Started";

            return (
              <Pressable
                key={tier.id}
                className="rounded-[28px] overflow-hidden bg-input border border-app shadow-sm"
              >
                {/* Card Header */}
                <View className={`${tier.color} p-5 rounded-b-[20px]`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-4">
                      <View className="flex-row flex-wrap items-center gap-2 mb-2">
                        {tier.highlight && (
                          <View className="px-3 py-1 rounded-full bg-white/20">
                            <Text
                              className="text-[0.625rem] font-bold uppercase tracking-[2px]"
                              style={{ color: "#F2F6F2" }}
                            >
                              {tier.highlight}
                            </Text>
                          </View>
                        )}
                        {isTierEnrolled && (
                          <View className="px-3 py-1 rounded-full bg-white/25">
                            <Text
                              className="text-[0.625rem] font-bold uppercase tracking-[2px]"
                              style={{ color: "#F2F6F2" }}
                            >
                              Current Plan
                            </Text>
                          </View>
                        )}
                        {pricing?.badge && (
                          <View className="px-3 py-1 rounded-full bg-white/15">
                            <Text
                              className="text-[0.625rem] font-bold uppercase tracking-[2px]"
                              style={{ color: "#F2F6F2" }}
                            >
                              {pricing.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className="text-[1.375rem] leading-tight font-clash font-bold mb-1"
                        style={{ color: "#F2F6F2" }}
                      >
                        {tier.name}
                      </Text>
                      <Text
                        className="font-outfit text-sm leading-snug"
                        style={{ color: "#E6F2E6" }}
                      >
                        {tier.description}
                      </Text>
                    </View>
                    <View className="h-12 w-12 bg-white/20 rounded-2xl items-center justify-center">
                      <Ionicons name={tier.icon as any} size={22} color="white" />
                    </View>
                  </View>
                </View>

                {/* Card Body */}
                <View className="p-5">
                  {pricing?.lines?.length ? (
                    <View className="mb-4">
                      {pricing.lines.map((line: string) => (
                        <Text key={line} className="text-[11px] font-outfit text-secondary">
                          {line}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <View className="gap-2.5 mb-5">
                    {tier.features.map((feature) => (
                      <View key={feature} className="flex-row items-center gap-2.5">
                        <View className="h-5 w-5 bg-[#2F8F57]/15 rounded-full items-center justify-center">
                          <Ionicons name="checkmark" size={12} color="#2F8F57" />
                        </View>
                        <Text className="text-[13px] font-outfit text-app flex-1">
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Action buttons */}
                  <View className="gap-2.5">
                    {/* Detail button — always visible */}
                    <Pressable
                      onPress={() => setSelectedTierId(tier.id as "php" | "plus" | "premium")}
                      className="rounded-full py-3 items-center border border-[#2F8F57]/30 bg-[#2F8F57]/5"
                    >
                      <Text className="text-sm font-outfit font-semibold text-[#2F8F57]">
                        View Program Details
                      </Text>
                    </Pressable>

                    {/* Subscribe / Apply buttons */}
                    {hasBothIntervals && !isTierEnrolled && !isPendingApproval && !isPendingPayment ? (
                      <View className="flex-row gap-2.5">
                        <Pressable
                          onPress={() => handleApply(tier.id as "php" | "plus" | "premium", "monthly")}
                          className="flex-1 rounded-full py-3 items-center bg-[#2F8F57]"
                        >
                          <Text className="text-xs font-outfit text-white font-semibold">
                            {monthlyLabel}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleApply(tier.id as "php" | "plus" | "premium", "yearly")}
                          className="flex-1 rounded-full py-3 items-center bg-[#1F6F45]"
                        >
                          <Text className="text-xs font-outfit text-white font-semibold">
                            {yearlyLabel}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleApply(tier.id as "php" | "plus" | "premium")}
                        className={`rounded-full py-3 items-center ${
                          isTierEnrolled || isPendingApproval
                            ? "bg-secondary/20"
                            : "bg-[#2F8F57]"
                        }`}
                        disabled={isTierEnrolled || isPendingApproval}
                      >
                        <Text className={`text-sm font-outfit font-semibold ${
                          isTierEnrolled || isPendingApproval ? "text-secondary" : "text-white"
                        }`}>
                          {primaryLabel}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

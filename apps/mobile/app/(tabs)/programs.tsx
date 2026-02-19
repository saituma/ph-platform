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
import { Ionicons } from "@expo/vector-icons"; // ← add if not already installed
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

  const [selectedTierId, setSelectedTierId] = useState<"php" | "plus" | "premium">("php");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        popular: true, // ← Most Popular
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

  useEffect(() => {
    if (programTier) {
      const normalized = normalizeProgramTier(programTier);
      if (normalized === "PHP_Plus") setSelectedTierId("plus");
      if (normalized === "PHP_Premium") setSelectedTierId("premium");
    }
  }, [programTier]);

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

  const renderSidebarPrograms = () => (
    <View>
      <Text className="text-xs font-outfit uppercase tracking-[2px] text-secondary mb-3">
        Programs
      </Text>
      <View className="gap-3">
        {tiers.map((tier) => {
          const isSelected = tier.id === selectedTierId;
          const requiredTier =
            tier.id === "plus" ? "PHP_Plus" : tier.id === "premium" ? "PHP_Premium" : "PHP";
          const pricing = pricingByTier[requiredTier];
          const plan = planDetailsByTier[requiredTier];
          const hasBothIntervals =
            plan?.billingInterval?.includes("monthly") &&
            plan?.billingInterval?.includes("yearly");
          const monthlyLabel =
            pricing?.lines?.find((line) => line.toLowerCase().startsWith("monthly")) ?? "Monthly";
          const yearlyLabel =
            pricing?.lines?.find((line) => line.toLowerCase().startsWith("yearly")) ?? "Yearly";
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
              onPress={() => setSelectedTierId(tier.id as "php" | "plus" | "premium")}
              className={`rounded-2xl border px-4 py-4 ${
                isSelected
                  ? "bg-[#2F8F57]/10 border-[#2F8F57]/30"
                  : "bg-input border-gray-100 dark:border-gray-800"
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`h-10 w-10 rounded-xl items-center justify-center ${
                    isSelected ? "bg-[#2F8F57]" : "bg-[#2F8F57]/20"
                  }`}
                >
                  <Ionicons
                    name={tier.icon as any}
                    size={18}
                    color={isSelected ? "white" : "#2F8F57"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-clash text-[16px] text-app">
                    {tier.name}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-0.5">
                    {tier.description}
                  </Text>
                </View>
                {pricing?.badge ? (
                  <View className="px-2.5 py-1 rounded-full bg-[#2F8F57]/10">
                    <Text className="text-[10px] font-outfit text-[#2F8F57]">
                      {pricing.badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              {pricing?.lines?.length ? (
                <View className="mt-3 gap-1">
                  {pricing.lines.map((line) => (
                    <Text key={line} className="text-[11px] font-outfit text-secondary">
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View className="mt-3 gap-2">
                {tier.features.map((feature) => (
                  <View key={feature} className="flex-row items-center gap-2">
                    <Ionicons name="checkmark" size={12} color="#2F8F57" />
                    <Text className="text-[12px] font-outfit text-app flex-1">
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="mt-4 flex-row gap-2">
                {hasBothIntervals && !isTierEnrolled && !isPendingApproval && !isPendingPayment ? (
                  <>
                    <Pressable
                      onPress={() => handleApply(tier.id as "php" | "plus" | "premium", "monthly")}
                      className="flex-1 rounded-full py-2.5 items-center bg-[#2F8F57]"
                    >
                      <Text className="text-xs font-outfit text-white">
                        {monthlyLabel}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleApply(tier.id as "php" | "plus" | "premium", "yearly")}
                      className="flex-1 rounded-full py-2.5 items-center bg-[#1F6F45]"
                    >
                      <Text className="text-xs font-outfit text-white">
                        {yearlyLabel}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => handleApply(tier.id as "php" | "plus" | "premium")}
                    className={`flex-1 rounded-full py-2.5 items-center ${
                      isTierEnrolled || isPendingApproval
                        ? "bg-secondary/20"
                        : "bg-[#2F8F57]"
                    }`}
                    disabled={isTierEnrolled || isPendingApproval}
                  >
                    <Text className={`text-xs font-outfit ${
                      isTierEnrolled || isPendingApproval ? "text-secondary" : "text-white"
                    }`}>
                      {primaryLabel}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

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

  // ... (handleApply and refreshBillingStatus stay exactly the same)

  const isWide = width >= 768;

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      {/* Mobile Sidebar Overlay */}
      {!isWide && isSidebarOpen && (
        <View className="absolute inset-0 z-50">
          <Pressable
            onPress={() => setIsSidebarOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <View className="absolute left-0 top-0 bottom-0 w-96 bg-app border-r border-gray-100 dark:border-gray-800">
            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 48, paddingBottom: 40 }}>
              {renderSidebarPrograms()}
            </ScrollView>
          </View>
        </View>
      )}

      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        {!isWide ? (
          <Pressable
            onPress={() => setIsSidebarOpen(true)}
            className="h-10 w-10 rounded-2xl bg-input border border-gray-100 dark:border-gray-800 items-center justify-center"
          >
            <Ionicons name="menu" size={20} color="#2F8F57" />
          </Pressable>
        ) : (
          <View className="w-10" />
        )}
        <Text className="text-2xl font-clash text-app">Programs</Text>
        <View className="w-10" />
      </View>

      <View className={isWide ? "flex-row gap-6 px-6 flex-1" : "flex-1"}>
          {/* Sidebar */}
          {isWide ? <View className="w-96">{renderSidebarPrograms()}</View> : null}

          {/* Details */}
          <View className="flex-1">
            <ProgramDetailPanel programId={selectedTierId} />
          </View>
        </View>
    </SafeAreaView>
  );
}

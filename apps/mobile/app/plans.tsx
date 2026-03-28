import { ProgramCard, ProgramTier } from "@/components/ProgramCard";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { apiRequest } from "@/lib/api";
import { buildPlanPricing } from "@/lib/billing";
import { normalizeProgramTier, tierRank } from "@/lib/planAccess";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, InteractionManager, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setLatestSubscriptionRequest, setProgramTier } from "../store/slices/userSlice";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { Text } from "@/components/ScaledText";

export default function PlansScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, programTier, latestSubscriptionRequest } = useAppSelector((state) => state.user);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const waitForInteractions = useCallback(
    () => new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve())),
    [],
  );

  const tierMap = useMemo(() => {
    return new Map<string, ProgramTier>(
      PROGRAM_TIERS.map((tier) => {
        const key =
          tier.id === "php"
            ? "PHP"
            : tier.id === "plus"
              ? "PHP_Plus"
              : "PHP_Premium";
        return [key, tier];
      })
    );
  }, []);
  const resolvedTier = useMemo(() => {
    const normalized = normalizeProgramTier(programTier);
    if (normalized) return normalized;
    if (latestSubscriptionRequest?.status === "approved" && latestSubscriptionRequest?.planTier) {
      return String(latestSubscriptionRequest.planTier);
    }
    return null;
  }, [latestSubscriptionRequest?.planTier, latestSubscriptionRequest?.status, programTier]);

  const mergedPlans = useMemo(() => {
    const map = new Map<string, any>();
    plans.forEach((plan) => {
      if (plan?.tier) {
        map.set(String(plan.tier), plan);
      }
    });
    if (!map.has("PHP")) {
      map.set("PHP", {
        id: "placeholder-php",
        tier: "PHP",
        name: "PHP Program",
        displayPrice: "Included",
        billingInterval: "included",
        monthlyPrice: "",
        yearlyPrice: "",
        isPlaceholder: true,
      });
    }
    return Array.from(map.values());
  }, [plans]);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const data = await apiRequest<{ plans: any[] }>("/public/plans", { forceRefresh: true });
      setPlans(data.plans ?? []);
    } catch (error: any) {
      setActionError(error?.message || "Failed to load plans.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        skipCache: true,
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

  useEffect(() => {
    void loadPlans();
    void refreshBillingStatus();
  }, [loadPlans, refreshBillingStatus]);
  useEffect(() => {
    void refreshBillingStatus();
  }, [refreshBillingStatus]);

  const handleCheckout = useCallback(
    async (planId: number, interval?: "monthly" | "yearly") => {
      if (isProcessingPayment) {
        return;
      }
      setActionError(null);
      try {
        if (!token) {
          Alert.alert("Login required", "Please log in as a guardian to purchase a plan.");
          router.replace("/(auth)/login");
          return;
        }
        setIsProcessingPayment(true);
        await waitForInteractions();
        const data = await apiRequest<{
          customerId: string;
          ephemeralKey: string;
          paymentIntentId: string;
          paymentIntentClientSecret: string;
          request?: any;
        }>("/billing/payment-sheet", {
          method: "POST",
          body: { planId, interval },
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
          }
        );

        dispatch(setLatestSubscriptionRequest(confirm.request ?? data.request ?? null));

        Alert.alert(
          "Payment status",
          confirm.paymentStatus === "succeeded" || confirm.paymentStatus === "processing"
            ? "Payment received. Awaiting admin approval."
            : "Payment pending. We will update your plan once confirmed."
        );
      } catch (error: any) {
        const message = error?.message || "Failed to start checkout.";
        if (typeof message === "string" && message.includes("403")) {
          Alert.alert("Guardian only", "Only guardian accounts can purchase plans.");
          return;
        }
        setActionError(message);
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [dispatch, isProcessingPayment, router, token, waitForInteractions]
  );

  const handleDowngrade = useCallback(
    async (tier: string) => {
      setActionError(null);
      try {
        if (!token) {
          Alert.alert("Login required", "Please log in to change your plan.");
          router.replace("/(auth)/login");
          return;
        }
        await apiRequest("/billing/downgrade", {
          method: "POST",
          token,
          body: { tier },
        });
        dispatch(setProgramTier(tier));
        dispatch(setLatestSubscriptionRequest(null));
        Alert.alert("Plan updated", "Your plan has been downgraded.");
      } catch (error: any) {
        const message = error?.message || "Failed to change plan.";
        setActionError(message);
      }
    },
    [token, router, dispatch]
  );

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/more")}
          className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
        >
          <Feather name="arrow-left" size={20} className="text-app" />
        </TouchableOpacity>
        <Text className="text-xl font-clash text-app font-bold">
          Subscription Plan
        </Text>
        <View className="w-10" />
      </View>

      <ThemedScrollView
        onRefresh={async () => {
          await Promise.all([loadPlans(), refreshBillingStatus()]);
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-telma-bold text-app">
              Choose Your Plan
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Select the best coaching tier for your athlete&apos;s development and
            goals.
          </Text>
          {resolvedTier ? (
            <View className="mt-4 rounded-2xl border border-app/10 bg-secondary/10 px-4 py-3">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px]">
                Current Plan
              </Text>
              <Text className="text-base font-clash text-app mt-1">
                {tierMap.get(resolvedTier ?? "PHP")?.name ?? "PHP Program"}
              </Text>
              {latestSubscriptionRequest?.status &&
              ["pending_payment", "pending_approval"].includes(
                String(latestSubscriptionRequest.status)
              ) ? (
                <Text className="text-xs font-outfit text-secondary mt-1">
                  Upgrade request pending approval.
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-100 px-4 py-3">
              <Text className="text-xs font-outfit text-amber-900 uppercase tracking-[1.4px]">
                No active plan
              </Text>
              <Text className="text-sm font-outfit text-amber-900 mt-1">
                Choose a plan to unlock full access.
              </Text>
            </View>
          )}
        </View>

        {actionError ? (
          <View className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <Text className="text-sm text-red-600 font-outfit">
              {actionError}
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View className="rounded-3xl border border-dashed border-app bg-input p-6">
            <Text className="text-sm text-secondary font-outfit text-center">
              Loading plans...
            </Text>
          </View>
        ) : mergedPlans.length === 0 ? (
          <View className="rounded-3xl border border-dashed border-app bg-input p-6">
            <Text className="text-sm text-secondary font-outfit text-center">
              No plans available yet.
            </Text>
          </View>
        ) : (
          mergedPlans.map((plan, index) => {
            const baseTier = tierMap.get(plan.tier);
            const pricing = buildPlanPricing(plan);
            const normalizedTier = resolvedTier;
            const isCurrentPlan = normalizedTier === plan.tier;
            const isPendingRequest =
              !isCurrentPlan &&
              latestSubscriptionRequest?.planTier === plan.tier &&
              ["pending_payment", "pending_approval"].includes(
                String(latestSubscriptionRequest?.status ?? "")
              );
            const currentRank = tierRank(normalizedTier);
            const targetRank = tierRank(plan.tier);
            const isDowngrade = currentRank >= 0 && targetRank >= 0 && targetRank < currentRank;
            const tier: ProgramTier = {
              ...(baseTier ?? PROGRAM_TIERS[0]),
              name: plan.name,
              description: baseTier?.description ?? PROGRAM_TIERS[0].description,
              features: baseTier?.features ?? PROGRAM_TIERS[0].features,
              priceBadge: pricing.badge,
              priceLines: pricing.lines,
              priceEntries: pricing.entries,
              discountNote: pricing.discountNote,
              highlight: isCurrentPlan ? "Current Plan" : isPendingRequest ? "Pending Approval" : baseTier?.highlight,
            };
            const handleSelect = () => {
              if (plan.isPlaceholder) {
                if (isDowngrade) {
                  Alert.alert(
                    "Downgrade to PHP Program",
                    "Your plan will change immediately. No payment required.",
                    [
                      { text: "Confirm", onPress: () => handleDowngrade("PHP") },
                      { text: "Cancel", style: "cancel" },
                    ]
                  );
                  return;
                }
                Alert.alert(
                  "PHP Program",
                  "This plan is included after onboarding. No payment required.",
                  [
                    { text: "Go to Programs", onPress: () => router.push("/(tabs)/programs") },
                    { text: "OK", style: "cancel" },
                  ]
                );
                return;
              }
              if (isCurrentPlan) {
                Alert.alert("Current plan", "You're already on this plan.");
                return;
              }
              if (isPendingRequest) {
                Alert.alert("Pending approval", "Your request is awaiting coach approval.");
                return;
              }
              if (isDowngrade) {
                Alert.alert(
                  "Downgrade plan",
                  "Your plan will change immediately. No payment required.",
                  [
                    { text: "Confirm", onPress: () => handleDowngrade(plan.tier) },
                    { text: "Cancel", style: "cancel" },
                  ]
                );
                return;
              }
              if (normalizedTier) {
                Alert.alert(
                  "Change plan",
                  "Changing plans will start a new payment and require coach approval.",
                  [
                    { text: "Continue", onPress: () => {
                      if (plan.billingInterval?.includes("monthly") && plan.billingInterval?.includes("yearly")) {
                        Alert.alert("Choose billing", "Select a billing interval", [
                          { text: "Monthly", onPress: () => handleCheckout(plan.id, "monthly") },
                          { text: "Yearly", onPress: () => handleCheckout(plan.id, "yearly") },
                          { text: "Cancel", style: "cancel" },
                        ]);
                        return;
                      }
                      const interval = plan.billingInterval?.includes("yearly") ? "yearly" : "monthly";
                      handleCheckout(plan.id, interval);
                    }},
                    { text: "Cancel", style: "cancel" },
                  ]
                );
                return;
              }
              if (plan.billingInterval?.includes("monthly") && plan.billingInterval?.includes("yearly")) {
                Alert.alert("Choose billing", "Select a billing interval", [
                  { text: "Monthly", onPress: () => handleCheckout(plan.id, "monthly") },
                  { text: "Yearly", onPress: () => handleCheckout(plan.id, "yearly") },
                  { text: "Cancel", style: "cancel" },
                ]);
                return;
              }
              const interval = plan.billingInterval?.includes("yearly") ? "yearly" : "monthly";
              handleCheckout(plan.id, interval);
            };
            return (
              <ProgramCard
                key={plan.id}
                tier={tier}
                index={index}
                onPress={handleSelect}
              />
            );
          })
        )}
      </ThemedScrollView>
    </SafeAreaView>
  );
}

import { ProgramTier } from "@/components/ProgramCard";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canAccessTier, normalizeProgramTier } from "@/lib/planAccess";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { NavigationContainer, NavigationIndependentTree } from "@react-navigation/native";
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
import { useRouter } from "expo-router";

export default function ProgramsScreen() {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const router = useRouter();
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTierId, setPickerTierId] = useState<"php" | "plus" | "premium" | null>(null);

  const openPaymentPicker = useCallback((tierId: "php" | "plus" | "premium") => {
    setPickerTierId(tierId);
    setPickerOpen(true);
  }, []);

  const closePaymentPicker = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const getDiscountCopy = useCallback((plan?: any | null) => {
    if (!plan?.discountValue || !plan?.discountType) return null;
    const value = String(plan.discountValue).trim();
    if (!value) return null;
    const unit = plan.discountType === "percent" ? "%" : "";
    const applies =
      plan.discountAppliesTo === "monthly"
        ? "monthly"
        : plan.discountAppliesTo === "yearly"
        ? "yearly"
        : plan.discountAppliesTo === "both"
        ? "monthly + yearly"
        : "plans";
    return `Discount: ${value}${unit} (${applies})`;
  }, []);

  const renderPricingLines = useCallback((pricing?: PlanPricing) => {
    if (!pricing) return null;
    if (!pricing.entries?.length) {
      return pricing.lines.map((line) => (
        <Text key={line} className="text-[11px] font-outfit text-secondary">
          {line}
        </Text>
      ));
    }
    return pricing.entries.map((entry) => (
      <View key={`${entry.label}-${entry.original}`} className="mb-2">
        <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1px]">
          {entry.label}
        </Text>
        {entry.discounted ? (
          <View className="mt-1">
            {entry.discountLabel ? (
              <Text className="text-[10px] font-outfit text-red-400 mb-1">
                {entry.discountLabel}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-outfit text-red-400 line-through">
                {entry.original}
              </Text>
              <Text className="text-sm font-outfit text-[#2F8F57] font-semibold">
                {entry.discounted}
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-xs font-outfit text-app">{entry.original}</Text>
        )}
      </View>
    ));
  }, []);

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
        icon: "pulse",
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

  const loadPlans = useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
    const plansRes = await fetch(`${baseUrl}/public/plans`);
    if (!plansRes.ok) return;
    const plansResponse: { plans: any[] } = await plansRes.json();
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
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadPlans();
      } catch {
        // ignore
      }
    })();
  }, [loadPlans]);

  const handleRefresh = useCallback(async () => {
    if (!token) return;
    try {
      setIsRefreshing(true);
      await Promise.all([refreshBillingStatus(), loadPlans()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPlans, refreshBillingStatus, token]);

  // If a plan is selected, show its detail view
  if (selectedTierId) {
    const requiredTier =
      selectedTierId === "plus" ? "PHP_Plus" : selectedTierId === "premium" ? "PHP_Premium" : "PHP";
    const plan = planDetailsByTier[requiredTier];
    const pricing = pricingByTier[requiredTier];
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <NavigationIndependentTree>
          <NavigationContainer independent>
            <ProgramDetailPanel
              programId={selectedTierId}
              showBack
              onBack={() => setSelectedTierId(null)}
              onNavigate={(path) => router.push(path)}
              planDetails={plan}
              pricing={pricing}
              onApply={handleApply}
              latestSubscriptionRequest={latestSubscriptionRequest ?? null}
            />
          </NavigationContainer>
        </NavigationIndependentTree>
      </SafeAreaView>
    );
  }

  // Otherwise, show the plan cards
  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
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
            const hasTierAccess = canAccessTier(programTier, requiredTier);
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
                        {!hasTierAccess && tier.id !== "php" ? (
                          <View className="px-3 py-1 rounded-full bg-white/15">
                            <Text
                              className="text-[0.625rem] font-bold uppercase tracking-[2px]"
                              style={{ color: "#F2F6F2" }}
                            >
                              Locked
                            </Text>
                          </View>
                        ) : null}
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
                  {pricing ? (
                    <View className="mb-4">{renderPricingLines(pricing)}</View>
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
                      <Pressable
                        onPress={() => openPaymentPicker(tier.id as "php" | "plus" | "premium")}
                        className="rounded-full py-3 items-center bg-[#2F8F57]"
                      >
                        <Text className="text-sm font-outfit text-white font-semibold">
                          Pay Now
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          if (isPendingPayment) {
                            openPaymentPicker(tier.id as "php" | "plus" | "premium");
                            return;
                          }
                          handleApply(tier.id as "php" | "plus" | "premium");
                        }}
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

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={closePaymentPicker}
      >
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-6" onPress={closePaymentPicker}>
          <Pressable
            className="w-full rounded-3xl border border-app/20 bg-input p-5"
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-lg font-clash text-app font-bold">Choose billing</Text>
            <Text className="text-sm font-outfit text-secondary mt-1">
              Select a billing interval to continue.
            </Text>
            {(() => {
              if (!pickerTierId) return null;
              const requiredTier =
                pickerTierId === "plus" ? "PHP_Plus" : pickerTierId === "premium" ? "PHP_Premium" : "PHP";
              const plan = planDetailsByTier[requiredTier];
              const discountCopy = getDiscountCopy(plan);
              if (!discountCopy) return null;
              return (
                <View className="mt-3 rounded-2xl border border-app/15 bg-white/10 px-3 py-2">
                  <Text className="text-xs font-outfit text-secondary">{discountCopy}</Text>
                </View>
              );
            })()}
            <View className="mt-4 gap-2.5">
              {(() => {
                if (!pickerTierId) return null;
                const requiredTier =
                  pickerTierId === "plus" ? "PHP_Plus" : pickerTierId === "premium" ? "PHP_Premium" : "PHP";
                const pricing = pricingByTier[requiredTier];
                const monthlyEntry = pricing?.entries?.find((entry) => entry.label === "Monthly");
                const yearlyEntry = pricing?.entries?.find((entry) => entry.label === "Yearly");
                return (
                  <>
                    <Pressable
                      onPress={() => {
                        closePaymentPicker();
                        handleApply(pickerTierId, "monthly");
                      }}
                      className="rounded-full py-3 items-center bg-[#2F8F57]"
                    >
                      <Text className="text-sm font-outfit text-white font-semibold">Monthly</Text>
                      {monthlyEntry?.discounted ? (
                        <View className="mt-1 items-center">
                          {monthlyEntry.discountLabel ? (
                            <Text className="text-[10px] font-outfit text-red-200">
                              {monthlyEntry.discountLabel}
                            </Text>
                          ) : null}
                          <View className="mt-1 flex-row items-center gap-2">
                            <Text className="text-[10px] font-outfit text-red-200 line-through">
                              {monthlyEntry.original}
                            </Text>
                            <Text className="text-xs font-outfit text-white">
                              {monthlyEntry.discounted}
                            </Text>
                          </View>
                        </View>
                      ) : monthlyEntry ? (
                        <Text className="text-xs font-outfit text-white mt-1">
                          {monthlyEntry.original}
                        </Text>
                      ) : null}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        closePaymentPicker();
                        handleApply(pickerTierId, "yearly");
                      }}
                      className="rounded-full py-3 items-center bg-[#1F6F45]"
                    >
                      <Text className="text-sm font-outfit text-white font-semibold">Yearly</Text>
                      {yearlyEntry?.discounted ? (
                        <View className="mt-1 items-center">
                          {yearlyEntry.discountLabel ? (
                            <Text className="text-[10px] font-outfit text-red-200">
                              {yearlyEntry.discountLabel}
                            </Text>
                          ) : null}
                          <View className="mt-1 flex-row items-center gap-2">
                            <Text className="text-[10px] font-outfit text-red-200 line-through">
                              {yearlyEntry.original}
                            </Text>
                            <Text className="text-xs font-outfit text-white">
                              {yearlyEntry.discounted}
                            </Text>
                          </View>
                        </View>
                      ) : yearlyEntry ? (
                        <Text className="text-xs font-outfit text-white mt-1">
                          {yearlyEntry.original}
                        </Text>
                      ) : null}
                    </Pressable>
                  </>
                );
              })()}
              <Pressable
                onPress={closePaymentPicker}
                className="rounded-full py-3 items-center border border-app/20 bg-white/10"
              >
                <Text className="text-sm font-outfit text-secondary">Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

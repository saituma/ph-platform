import { ProgramCard, ProgramTier } from "@/components/ProgramCard";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { apiRequest } from "@/lib/api";
import { buildPlanPricing } from "@/lib/billing";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "../store/hooks";
import * as WebBrowser from "expo-web-browser";

export default function PlansScreen() {
  const router = useRouter();
  const token = useAppSelector((state) => state.user.token);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const data = await apiRequest<{ plans: any[] }>("/public/plans");
      setPlans(data.plans ?? []);
    } catch (error: any) {
      setActionError(error?.message || "Failed to load plans.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handleCheckout = useCallback(
    async (planId: number, interval?: "monthly" | "yearly") => {
      setActionError(null);
      try {
        if (!token) {
          Alert.alert("Login required", "Please log in as a guardian to purchase a plan.");
          router.replace("/(auth)/login");
          return;
        }
        const data = await apiRequest<{
          checkoutUrl?: string;
          sessionId?: string;
        }>("/billing/checkout", {
          method: "POST",
          body: { planId, interval },
          token,
        });

        if (!data.checkoutUrl || !data.sessionId) {
          throw new Error("Checkout session unavailable.");
        }

        await WebBrowser.openBrowserAsync(data.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });

        const confirm = await apiRequest<{ paymentStatus?: string }>(
          "/billing/confirm",
          {
            method: "POST",
            body: { sessionId: data.sessionId },
            token,
          }
        );

        Alert.alert(
          "Payment status",
          confirm.paymentStatus === "paid"
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
      }
    },
    [token, router]
  );

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/more")}
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
        onRefresh={loadPlans}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-clash text-app">
              Choose Your Plan
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Select the best coaching tier for your athlete's development and
            goals.
          </Text>
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
        ) : plans.length === 0 ? (
          <View className="rounded-3xl border border-dashed border-app bg-input p-6">
            <Text className="text-sm text-secondary font-outfit text-center">
              No plans available yet.
            </Text>
          </View>
        ) : (
          plans.map((plan, index) => {
            const baseTier = tierMap.get(plan.tier);
            const pricing = buildPlanPricing(plan);
            const tier: ProgramTier = {
              ...(baseTier ?? PROGRAM_TIERS[0]),
              name: plan.name,
              priceBadge: pricing.badge,
              priceLines: pricing.lines,
              discountNote: pricing.discountNote,
            };
            const handleSelect = () => {
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

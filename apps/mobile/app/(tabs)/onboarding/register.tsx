import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { RegisterFormFields } from "@/components/onboarding/register/RegisterFormFields";
import { RegisterOverlays } from "@/components/onboarding/register/RegisterOverlays";
import { useRegisterController } from "@/hooks/onboarding/useRegisterController";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, RefreshControl, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { apiRequest } from "@/lib/api";
import { buildPlanPricing } from "@/lib/billing";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLatestSubscriptionRequest } from "@/store/slices/userSlice";

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.user);
  const {
    profile,
    control,
    errors,
    setValue,
    isVisible,
    labelFor,
    optionsFor,
    levelOptionsForTeam,
    relationValue,
    programValue,
    teamValue,
    getValue,
    customFields,
    showTerms,
    showPrivacy,
    setShowTerms,
    setShowPrivacy,
    isSubmitting,
    formError,
    config,
    configLoading,
    isRefreshing,
    setIsRefreshing,
    loadConfig,
    dropdownOpen,
    setDropdownOpen,
    teamTriggerRef,
    levelTriggerRef,
    openDropdown,
    onSubmit,
    dropdownState,
  } = useRegisterController({ router, mode: params?.mode });

  const [planByTier, setPlanByTier] = React.useState<Record<string, any>>({});
  const [planPricingByTier, setPlanPricingByTier] = React.useState<Record<string, any>>({});
  const [isPaying, setIsPaying] = React.useState(false);
  const [payingTier, setPayingTier] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        const data = await apiRequest<{ plans: any[] }>("/public/plans");
        if (!active) return;
        const map: Record<string, any> = {};
        const pricingMap: Record<string, any> = {};
        (data.plans ?? []).forEach((plan) => {
          const tierKey = String(plan?.tier ?? "");
          if (!tierKey) return;
          map[tierKey] = plan;
          pricingMap[tierKey] = buildPlanPricing(plan);
        });
        setPlanByTier(map);
        setPlanPricingByTier(pricingMap);
      } catch {
        if (!active) return;
      }
    };
    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const handlePayPlan = React.useCallback(
    async (tierKey: string, interval?: "monthly" | "yearly") => {
      if (isPaying) return;
      const plan = planByTier[tierKey];
      if (!plan?.id) {
        Alert.alert("Plan unavailable", "Pricing is not available right now.");
        return;
      }
      if (!token) {
        Alert.alert("Login required", "Please log in as a guardian to purchase a plan.");
        router.replace("/(auth)/login");
        return;
      }
      try {
        setIsPaying(true);
        setPayingTier(tierKey);
        setValue("desiredProgramType", tierKey);

        const data = await apiRequest<{
          customerId: string;
          ephemeralKey: string;
          paymentIntentId: string;
          paymentIntentClientSecret: string;
          request?: any;
        }>("/billing/payment-sheet", {
          method: "POST",
          body: { planId: plan.id, interval },
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
        Alert.alert("Payment failed", message);
      } finally {
        setIsPaying(false);
        setPayingTier(null);
      }
    },
    [dispatch, isPaying, planByTier, router, setValue, token],
  );

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-6 pt-4 mb-4">
        <Pressable onPress={() => router.navigate("/(tabs)/onboarding")} className="p-2 -ml-2 self-start">
          <Feather name="arrow-left" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await loadConfig(false);
              setIsRefreshing(false);
            }}
            tintColor={colors.textSecondary}
          />
        }
      >
        <View className="mb-8">
          <Text className="text-4xl font-clash text-app mb-2">
            {profile?.name ? `Welcome, ${profile.name}` : config?.welcomeMessage || "Athlete Profile"}
          </Text>
          <Text className="text-base font-outfit text-secondary">
            {config?.coachMessage || "Enter your child's details to personalize their training plan."}
          </Text>
        </View>

        {configLoading ? <Text className="text-secondary font-outfit mb-4">Loading form...</Text> : null}

        <RegisterFormFields
          control={control}
          errors={errors}
          colors={colors}
          isVisible={isVisible}
          labelFor={labelFor}
          optionsFor={optionsFor}
          levelOptionsForTeam={levelOptionsForTeam}
          relationValue={relationValue}
          programValue={programValue}
          teamValue={teamValue}
          getValue={getValue}
          customFields={customFields}
          setValue={setValue}
          teamTriggerRef={teamTriggerRef}
          levelTriggerRef={levelTriggerRef}
          onOpenDropdown={openDropdown}
          onOpenTerms={() => setShowTerms(true)}
          onOpenPrivacy={() => setShowPrivacy(true)}
          planPricingByTier={planPricingByTier}
          onPayPlan={handlePayPlan}
          payingTier={payingTier}
          isPaying={isPaying}
        />

        <Pressable
          onPress={onSubmit}
          className={`bg-accent h-14 rounded-xl items-center justify-center mb-8 w-full ${isSubmitting ? "opacity-70" : ""}`}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-lg font-outfit">
            {isSubmitting ? "Saving..." : "Complete Registration"}
          </Text>
        </Pressable>

        {formError ? <Text className="text-danger text-xs font-outfit mb-6">{formError}</Text> : null}
      </KeyboardAwareScrollView>

      <RegisterOverlays
        showTerms={showTerms}
        showPrivacy={showPrivacy}
        dropdownOpen={dropdownOpen}
        dropdownTop={dropdownState?.top ?? 0}
        dropdownLeft={dropdownState?.anchor.x ?? 0}
        dropdownWidth={dropdownState?.anchor.width ?? 0}
        dropdownMaxHeight={dropdownState?.maxHeight ?? 220}
        dropdownOptions={dropdownState?.options ?? []}
        onCloseTerms={() => setShowTerms(false)}
        onClosePrivacy={() => setShowPrivacy(false)}
        onCloseDropdown={() => setDropdownOpen(null)}
        onPickDropdownOption={(option) => {
          if (dropdownOpen === "team") {
            setValue("team", option);
          } else {
            setValue("level", option as never);
          }
          setDropdownOpen(null);
        }}
      />
    </SafeAreaView>
  );
}

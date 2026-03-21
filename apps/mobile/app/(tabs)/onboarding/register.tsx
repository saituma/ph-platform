import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { RegisterFormFields } from "@/components/onboarding/register/RegisterFormFields";
import { RegisterOverlays } from "@/components/onboarding/register/RegisterOverlays";
import { useRegisterController } from "@/hooks/onboarding/useRegisterController";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
    configLoading,
    dropdownOpen,
    setDropdownOpen,
    teamTriggerRef,
    levelTriggerRef,
    openDropdown,
    onSubmit,
    validateStep,
    dropdownState,
  } = useRegisterController({ router: router as any, mode: params?.mode });

  const [planByTier, setPlanByTier] = React.useState<Record<string, any>>({});
  const [planPricingByTier, setPlanPricingByTier] = React.useState<Record<string, any>>({});
  const [isPaying, setIsPaying] = React.useState(false);
  const [payingTier, setPayingTier] = React.useState<string | null>(null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        const data = await apiRequest<{ plans: any[] }>("/public/plans", { forceRefresh: true });
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

  React.useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
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

        await new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve()));
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

  const insets = useSafeAreaInsets();
  const steps = [
    {
      title: "Athlete details",
      body: "Start with the athlete's basic profile and current playing context.",
    },
    {
      title: "Training context",
      body: "Add training load, injuries, goals, and equipment to guide the plan.",
    },
    {
      title: "Guardian details",
      body: "Finish with guardian info, any custom questions, and consent.",
    },
  ] as const;

  const canGoBack = currentStep > 0;
  const isFinalStep = currentStep === steps.length - 1;
  const stepBody =
    currentStep === 0
      ? "Add the basics first so the training path starts in the right age group."
      : currentStep === 1
        ? "This helps tailor workload, recovery, and goals."
        : "Finish with guardian contact details and consent.";

  const handleBack = () => setCurrentStep((step) => Math.max(0, step - 1));
  const handleNext = React.useCallback(async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;
    setCurrentStep((step) => Math.min(steps.length - 1, step + 1));
  }, [currentStep, steps.length, validateStep]);

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.navigate("/(tabs)/onboarding")}
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.cardElevated,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Feather name="arrow-left" size={20} color={colors.textSecondary} />
        </Pressable>

        <View style={{ flex: 1, paddingHorizontal: 14 }}>
          <Text className="font-outfit-semibold text-app" style={{ fontSize: 19 }}>
            {steps[currentStep].title}
          </Text>
          <Text className="font-outfit text-secondary" style={{ fontSize: 13, lineHeight: 18 }}>
            {profile?.name ? `For ${profile.name} • Step ${currentStep + 1} of ${steps.length}` : `Step ${currentStep + 1} of ${steps.length}`}
          </Text>
        </View>

        <View
          style={{
            minWidth: 54,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 999,
            alignItems: "center",
            backgroundColor: `${colors.accent}12`,
            borderWidth: 1,
            borderColor: `${colors.accent}22`,
          }}
        >
          <Text className="font-outfit-semibold" style={{ color: colors.accent, fontSize: 12 }}>
            {`${currentStep + 1}/${steps.length}`}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <View
          style={{
            alignSelf: "flex-start",
            marginBottom: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: colors.cardElevated,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text className="font-outfit-semibold" style={{ color: colors.textSecondary, fontSize: 11 }}>
            ONBOARDING
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {steps.map((item, index) => {
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            return (
              <View
                key={item.title}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: isActive || isComplete ? colors.accent : `${colors.textSecondary}22`,
                }}
              />
            );
          })}
        </View>
        <Text className="font-outfit text-secondary" style={{ fontSize: 14, lineHeight: 20, maxWidth: "92%" }}>
          {steps[currentStep].body}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: isFinalStep
              ? (keyboardVisible ? 140 : 150)
              : (keyboardVisible ? 180 : 190),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <View
            style={{
              borderRadius: 30,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              boxShadow: "0 20px 42px rgba(15, 23, 42, 0.06)",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: 14,
                backgroundColor: colors.cardElevated,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text className="font-outfit-semibold text-app" style={{ fontSize: 17, marginBottom: 4 }}>
                {steps[currentStep].title}
              </Text>
              <Text className="font-outfit text-secondary" style={{ fontSize: 13, lineHeight: 18 }}>
                {stepBody}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: 24,
              }}
            >
              {configLoading ? <Text className="text-secondary font-outfit mb-4">Loading form...</Text> : null}

              <RegisterFormFields
                control={control}
                errors={errors}
                colors={colors as any}
                step={currentStep}
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
              {formError ? <Text className="text-danger text-sm font-outfit mt-2">{formError}</Text> : null}
              {isFinalStep ? (
                <View style={{ marginTop: 18, gap: 10 }}>
                  <Text className="font-outfit text-secondary" style={{ fontSize: 12, lineHeight: 18 }}>
                    Final step: submit the onboarding details to finish setup.
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={{
                height: 1,
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom + 10, 14),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.cardElevated,
          gap: 10,
        }}
      >
        {!keyboardVisible ? (
          <Text className="font-outfit text-secondary" style={{ fontSize: 13, lineHeight: 19 }}>
            {!isFinalStep
              ? "Complete this step, then continue."
              : "Review the details, then finish registration."}
          </Text>
        ) : null}

        {!isFinalStep ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            {canGoBack ? (
              <Pressable
                onPress={handleBack}
                style={{
                  flex: 1,
                  minHeight: 54,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                }}
              >
                <Text className="font-outfit-semibold text-app" style={{ fontSize: 16 }}>
                  Back
                </Text>
              </Pressable>
            ) : null}

            <View style={{ flex: 1 }}>
              <Pressable
                accessibilityRole="button"
                onPress={handleNext}
                style={{
                  width: "100%",
                  minHeight: 54,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 18,
                  backgroundColor: colors.accent,
                }}
              >
                <Text className="font-outfit-semibold" style={{ color: "#FFFFFF", fontSize: 16 }}>
                  Next
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={onSubmit}
              disabled={isSubmitting}
              style={{
                width: "100%",
                minHeight: 58,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 10,
                paddingHorizontal: 18,
                backgroundColor: colors.accent,
                opacity: isSubmitting ? 0.72 : 1,
              }}
            >
              <Feather
                name={isSubmitting ? "loader" : "check-circle"}
                size={18}
                color="#FFFFFF"
              />
              <Text className="font-outfit-semibold" style={{ color: "#FFFFFF", fontSize: 16 }}>
                {isSubmitting ? "Saving registration" : "Complete Registration"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleBack}
              style={{
                minHeight: 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
              }}
            >
              <Text className="font-outfit-semibold text-app" style={{ fontSize: 15 }}>
                Back
              </Text>
            </Pressable>
          </View>
        )}
      </View>

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
    </View>
  );
}

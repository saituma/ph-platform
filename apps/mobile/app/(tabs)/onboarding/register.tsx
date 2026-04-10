import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { isAdminRole } from "@/lib/isAdminRole";
import { useRegisterController } from "@/hooks/onboarding/useRegisterController";
import { useRegisterBilling } from "@/hooks/onboarding/useRegisterBilling";
import { useProgramPlans } from "@/hooks/billing/useProgramPlans";

import { RegisterHeader } from "@/components/onboarding/register/RegisterHeader";
import { RegisterStepInfo } from "@/components/onboarding/register/RegisterStepInfo";
import { RegisterFormFields } from "@/components/onboarding/register/RegisterFormFields";
import { RegisterOverlays } from "@/components/onboarding/register/RegisterOverlays";
import { OnboardingActionButton } from "@/components/onboarding/OnboardingActionButton";
import { Text } from "@/components/ScaledText";

const STEPS = [
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

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const { colors } = useAppTheme();
  const { token, apiUserRole } = useAppSelector((state) => state.user);
  const insets = useSafeAreaInsets();

  if (isAdminRole(apiUserRole)) {
    return <Redirect href="/(tabs)" />;
  }

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

  const { plansByTier, planDetailsByTier, pricingByTier, loadPlans } = useProgramPlans();
  const { isPaying, payingTier, handlePayPlan } = useRegisterBilling(token);

  const [currentStep, setCurrentStep] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    loadPlans(true);
  }, [loadPlans]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    } else {
      router.navigate("/(tabs)/onboarding");
    }
  };

  const handleNext = useCallback(async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  }, [currentStep, validateStep]);

  const stepBodyText = useMemo(() => {
    if (currentStep === 0) return "Add the basics first so the training path starts in the right age group.";
    if (currentStep === 1) return "This helps tailor workload, recovery, and goals.";
    return "Finish with guardian contact details and consent.";
  }, [currentStep]);

  const subtitle = profile?.name
    ? `For ${profile.name} • Step ${currentStep + 1} of ${STEPS.length}`
    : `Step ${currentStep + 1} of ${STEPS.length}`;

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top }}>
      <RegisterHeader
        title={STEPS[currentStep].title}
        subtitle={subtitle}
        currentStep={currentStep}
        totalSteps={STEPS.length}
        onBack={handleBack}
        colors={colors}
      />

      <RegisterStepInfo
        currentStep={currentStep}
        steps={STEPS}
        colors={colors}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: currentStep === STEPS.length - 1 ? (keyboardVisible ? 140 : 150) : (keyboardVisible ? 180 : 190),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              borderRadius: 30,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
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
                {STEPS[currentStep].title}
              </Text>
              <Text className="font-outfit text-secondary" style={{ fontSize: 13, lineHeight: 18 }}>
                {stepBodyText}
              </Text>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 }}>
              {configLoading && (
                <Text className="text-secondary font-outfit mb-4">Loading form...</Text>
              )}

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
                planPricingByTier={pricingByTier}
                onPayPlan={(tier) => {
                  const planId = plansByTier[tier];
                  const planDetail = planDetailsByTier[tier];
                  if (typeof planId === "number") {
                    handlePayPlan(tier, planId, planDetail?.isActive !== false);
                  }
                }}
                payingTier={payingTier}
                isPaying={isPaying}
              />

              {formError && (
                <Text className="text-danger text-sm font-outfit mt-2">{formError}</Text>
              )}

              {currentStep === STEPS.length - 1 && (
                <View style={{ marginTop: 18, gap: 10 }}>
                  <Text className="font-outfit text-secondary" style={{ fontSize: 12, lineHeight: 18 }}>
                    Final step: submit the onboarding details to finish setup.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 20),
            paddingTop: 20,
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View className="flex-row gap-3">
            {currentStep > 0 && (
              <View style={{ flex: 1 }}>
                <OnboardingActionButton
                  label="Back"
                  onPress={handleBack}
                  disabled={isSubmitting || isPaying}
                />
              </View>
            )}
            <View style={{ flex: 2 }}>
              <OnboardingActionButton
                label={currentStep === STEPS.length - 1 ? "Submit & Finish" : "Continue"}
                onPress={currentStep === STEPS.length - 1 ? onSubmit : handleNext}
                disabled={isSubmitting || isPaying}
                icon={currentStep === STEPS.length - 1 ? "check" : "arrow-right"}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <RegisterOverlays
        dropdownOpen={dropdownOpen}
        dropdownState={dropdownState}
        onCloseDropdown={() => setDropdownOpen(null)}
        onSelectOption={(val: string) => {
          if (dropdownOpen === "team") setValue("team", val);
          else setValue("level", val);
          setDropdownOpen(null);
        }}
        showTerms={showTerms}
        onCloseTerms={() => setShowTerms(false)}
        showPrivacy={showPrivacy}
        onClosePrivacy={() => setShowPrivacy(false)}
      />
    </View>
  );
}

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { RegisterFormFields } from "@/components/onboarding/register/RegisterFormFields";
import { RegisterOverlays } from "@/components/onboarding/register/RegisterOverlays";
import { useRegisterController } from "@/hooks/onboarding/useRegisterController";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
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
  } = useRegisterController();

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

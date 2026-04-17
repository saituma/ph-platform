import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRefreshContext } from "@/context/RefreshContext";

import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { AvatarSection } from "@/components/more/profile/AvatarSection";
import { ManagedAthletesSection } from "@/components/more/profile/ManagedAthletesSection";

export default function ProfileSettingsScreen() {
  const { isSectionHidden } = useAgeExperience();
  const { isLoading } = useRefreshContext();
  const { colors } = useAppTheme();

  const {
    profile,
    managedAthletes,
    managedAthleteCount,
    activeAthleteId,
    hasLoadedAthleteDetails,
    name,
    setName,
    email,
    height,
    setHeight,
    weight,
    setWeight,
    position,
    setPosition,
    athleteName,
    setAthleteName,
    athleteBirthDate,
    setAthleteBirthDate,
    athleteTeam,
    setAthleteTeam,
    athleteTrainingPerWeek,
    setAthleteTrainingPerWeek,
    athleteInjuries,
    setAthleteInjuries,
    athleteGrowthNotes,
    setAthleteGrowthNotes,
    athletePerformanceGoals,
    setAthletePerformanceGoals,
    athleteEquipmentAccess,
    setAthleteEquipmentAccess,
    athleteExtraResponses,
    setExtraResponseField,
    isUploadingAvatar,
    pendingAvatarUri,
    setPendingAvatarUri,
    isSaving,
    handlePickAvatar,
    handleConfirmAvatar,
    handleSave,
  } = useProfileSettings();

  if (isSectionHidden("settings")) {
    return (
      <AgeGate
        title="Settings locked"
        message="Settings are restricted for this age."
      />
    );
  }

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Profile Information"
        subtitle="Fine-tune identity details, update your avatar, and keep your account polished."
        badge="Profile"
      />

      <ThemedScrollView
        onRefresh={handleRefresh}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: 24,
          paddingTop: 24,
        }}
      >
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <View className="gap-6">
            <AvatarSection
              avatar={profile.avatar ?? null}
              name={name}
              setName={setName}
              email={email}
              isUploadingAvatar={isUploadingAvatar}
              onPickAvatar={handlePickAvatar}
              pendingAvatarUri={pendingAvatarUri}
              onCancelPending={() => setPendingAvatarUri(null)}
              onConfirmPending={handleConfirmAvatar}
            />

            <ManagedAthletesSection
              managedAthletes={managedAthletes}
              managedAthleteCount={managedAthleteCount}
            />

            <ActionButton
              label={isSaving ? "Saving..." : "Save Changes"}
              icon="check"
              color="bg-accent"
              iconColor="text-white"
              onPress={handleSave}
              fullWidth={true}
              size="xl"
            />
          </View>
        )}
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function ProfileSkeleton() {
  return (
    <View className="gap-6">
      <View className="bg-input rounded-3xl p-6 shadow-sm border border-app">
        <View className="flex-row items-center gap-4 mb-6">
          <Skeleton circle width={72} height={72} />
          <View className="flex-1 gap-2">
            <Skeleton width="60%" height={24} />
            <Skeleton width="40%" height={16} />
          </View>
        </View>
        <View className="flex-row items-center gap-3 mb-4">
          <Skeleton width={4} height={16} borderRadius={2} />
          <Skeleton width="35%" height={18} />
        </View>
        <View className="gap-4">
          <Skeleton width="100%" height={56} borderRadius={16} />
          <Skeleton width="100%" height={56} borderRadius={16} />
        </View>
      </View>
      <View className="bg-input rounded-3xl p-6 shadow-sm border border-app">
        <View className="flex-row items-center gap-4 mb-5">
          <Skeleton width={48} height={48} borderRadius={16} />
          <View className="flex-1 gap-2">
            <Skeleton width="50%" height={20} />
            <Skeleton width="70%" height={14} />
          </View>
        </View>
        <Skeleton width="100%" height={60} borderRadius={16} />
      </View>
    </View>
  );
}

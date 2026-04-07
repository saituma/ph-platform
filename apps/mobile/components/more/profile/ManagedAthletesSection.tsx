import React, { useState } from "react";
import { Image, Modal, Pressable, TouchableOpacity, View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { SectionHeader } from "./SectionHeader";
import { ManagedAthlete } from "./hooks/useProfileSettings";

interface ManagedAthletesSectionProps {
  managedAthletes: ManagedAthlete[];
  managedAthleteCount: number;
}

export function ManagedAthletesSection({
  managedAthletes,
  managedAthleteCount,
}: ManagedAthletesSectionProps) {
  const { colors, isDark } = useAppTheme();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View
      className="bg-input rounded-3xl p-6 shadow-sm border border-app"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <SectionHeader
        title="Guardian Settings"
        subtitle="Manage your household settings."
        icon="shield"
      />

      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        className="flex-row items-center justify-between py-4 border-t border-app"
      >
        <Text className="text-base font-medium font-outfit text-app">
          Managed Athletes
        </Text>
        <View className="flex-row items-center">
          <Text className="text-accent font-medium mr-2">
            {managedAthleteCount} Active
          </Text>
          <Feather
            name="chevron-right"
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setIsVisible(false)}
        >
          <Pressable className="w-full rounded-3xl bg-app p-6 border border-app" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-clash text-app mb-2">Managed Athletes</Text>
            <Text className="text-sm font-outfit text-secondary mb-4">
              Review the athlete profiles managed by this account.
            </Text>
            {managedAthletes.length ? (
              <View className="gap-3">
                {managedAthletes.map((athlete, index) => (
                  <View key={athlete.id ?? athlete.name ?? `athlete-${index}`} className="gap-3">
                    <View className="flex-row items-center gap-3">
                      {athlete.profilePicture ? (
                        <View className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent">
                          <Image source={{ uri: athlete.profilePicture }} style={{ width: 56, height: 56 }} />
                        </View>
                      ) : (
                        <View className="w-14 h-14 rounded-full bg-secondary items-center justify-center border-2 border-accent">
                          <Feather name="user" size={26} color={colors.textSecondary} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-bold font-outfit text-app">
                          {athlete.name ?? "Athlete"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          {athlete.team ?? "Team not set"} • {athlete.level ?? "Level not set"}
                        </Text>
                      </View>
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-outfit text-app">
                        Age: {athlete.age ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Training days: {athlete.trainingPerWeek ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Goals: {athlete.performanceGoals ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Equipment: {athlete.equipmentAccess ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Injuries: {athlete.injuries ?? "—"}
                      </Text>
                    </View>
                    <View className="h-px bg-border/60" />
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm font-outfit text-secondary">
                No athlete profile found for this account.
              </Text>
            )}
            <TouchableOpacity
              onPress={() => setIsVisible(false)}
              className="mt-6 rounded-2xl bg-accent py-3 items-center"
            >
              <Text className="text-sm font-outfit text-white">Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

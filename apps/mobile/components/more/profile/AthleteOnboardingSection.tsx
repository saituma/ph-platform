import React, { useMemo } from "react";
import { View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { SectionHeader } from "./SectionHeader";
import { InputField } from "./InputField";

const toLabel = (key: string) => {
  const cleaned = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const EXCLUDED_EXTRA_KEYS = new Set(["height", "weight", "position"]);

export function AthleteOnboardingSection({
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
  height,
  setHeight,
  weight,
  setWeight,
  position,
  setPosition,
  athleteExtraResponses,
  setExtraResponseField,
}: {
  athleteName: string;
  setAthleteName: (value: string) => void;
  athleteBirthDate: string;
  setAthleteBirthDate: (value: string) => void;
  athleteTeam: string;
  setAthleteTeam: (value: string) => void;
  athleteTrainingPerWeek: string;
  setAthleteTrainingPerWeek: (value: string) => void;
  athleteInjuries: string;
  setAthleteInjuries: (value: string) => void;
  athleteGrowthNotes: string;
  setAthleteGrowthNotes: (value: string) => void;
  athletePerformanceGoals: string;
  setAthletePerformanceGoals: (value: string) => void;
  athleteEquipmentAccess: string;
  setAthleteEquipmentAccess: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  weight: string;
  setWeight: (value: string) => void;
  position: string;
  setPosition: (value: string) => void;
  athleteExtraResponses: Record<string, string>;
  setExtraResponseField: (key: string, value: string) => void;
}) {
  const { isDark } = useAppTheme();

  const extraKeys = useMemo(() => {
    return Object.keys(athleteExtraResponses)
      .filter((key) => !EXCLUDED_EXTRA_KEYS.has(key))
      .sort((a, b) => a.localeCompare(b));
  }, [athleteExtraResponses]);

  return (
    <View
      className="bg-input rounded-3xl p-6 shadow-sm border border-app"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <SectionHeader
        title="Athlete Information"
        subtitle="Review and update onboarding details for your active athlete."
        icon="clipboard"
      />

      <View className="gap-4">
        <InputField
          label="Athlete Name"
          value={athleteName}
          onChangeText={setAthleteName}
          icon="user"
        />
        <InputField
          label="Birth Date (YYYY-MM-DD)"
          value={athleteBirthDate}
          onChangeText={setAthleteBirthDate}
          placeholder="YYYY-MM-DD"
          icon="calendar"
        />
        <InputField
          label="Team"
          value={athleteTeam}
          onChangeText={setAthleteTeam}
          icon="flag"
        />
        <InputField
          label="Training Days / Week"
          value={athleteTrainingPerWeek}
          onChangeText={setAthleteTrainingPerWeek}
          placeholder="e.g. 3"
          icon="activity"
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <InputField
              label="Height"
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 180cm"
              icon="trending-up"
            />
          </View>
          <View className="flex-1">
            <InputField
              label="Weight"
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 75kg"
              icon="bar-chart-2"
            />
          </View>
        </View>

        <InputField
          label="Position"
          value={position}
          onChangeText={setPosition}
          placeholder="e.g. Striker"
          icon="target"
        />

        <InputField
          label="Performance Goals"
          value={athletePerformanceGoals}
          onChangeText={setAthletePerformanceGoals}
          icon="award"
        />
        <InputField
          label="Equipment Access"
          value={athleteEquipmentAccess}
          onChangeText={setAthleteEquipmentAccess}
          icon="tool"
        />
        <InputField
          label="Injuries / History"
          value={athleteInjuries}
          onChangeText={setAthleteInjuries}
          icon="alert-triangle"
        />
        <InputField
          label="Growth Notes"
          value={athleteGrowthNotes}
          onChangeText={setAthleteGrowthNotes}
          icon="edit-3"
        />

        {extraKeys.length ? (
          <View className="pt-2">
            {extraKeys.map((key) => (
              <View key={key} className="mt-4">
                <InputField
                  label={toLabel(key)}
                  value={athleteExtraResponses[key] ?? ""}
                  onChangeText={(value) => setExtraResponseField(key, value)}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

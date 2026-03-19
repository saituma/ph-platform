import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import { Controller, Control, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Platform, Pressable, View } from "react-native";

import { AthleteRegisterFormData, ConfigField } from "@/hooks/onboarding/useRegisterController";
import { Text, TextInput } from "@/components/ScaledText";
import { PROGRAM_TIERS } from "@/constants/Programs";

type ColorSet = {
  app: string;
  danger: string;
  textSecondary: string;
  placeholder: string;
  accent: string;
};

type RegisterFormFieldsProps = {
  control: Control<AthleteRegisterFormData>;
  errors: FieldErrors<AthleteRegisterFormData>;
  colors: ColorSet;
  step: number;
  isVisible: (id: string) => boolean;
  labelFor: (id: string, fallback: string) => string;
  optionsFor: (id: string) => string[];
  levelOptionsForTeam: (team: string) => string[];
  relationValue: string;
  programValue: string;
  teamValue: string;
  getValue: (name: string) => string;
  customFields: ConfigField[];
  setValue: UseFormSetValue<AthleteRegisterFormData>;
  teamTriggerRef: React.RefObject<View | null>;
  levelTriggerRef: React.RefObject<View | null>;
  onOpenDropdown: (type: "team" | "level") => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  planPricingByTier: Record<string, { badge?: string; lines?: string[] }>;
  onPayPlan: (tierKey: string, interval?: "monthly" | "yearly") => void;
  payingTier: string | null;
  isPaying: boolean;
};

function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return <Text className="text-danger text-xs font-outfit ml-2 mt-1">{text}</Text>;
}

export function RegisterFormFields({
  control,
  errors,
  colors,
  step,
  isVisible,
  labelFor,
  optionsFor,
  levelOptionsForTeam,
  relationValue,
  programValue,
  teamValue,
  getValue,
  customFields,
  setValue,
  teamTriggerRef,
  levelTriggerRef,
  onOpenDropdown,
  onOpenTerms,
  onOpenPrivacy,
  planPricingByTier,
  onPayPlan,
  payingTier,
  isPaying,
}: RegisterFormFieldsProps) {
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const isAthleteStep = step === 0;
  const isTrainingStep = step === 1;
  const isGuardianStep = step === 2;

  const tierByKey = useMemo(() => {
    const map = new Map<string, (typeof PROGRAM_TIERS)[number]>();
    PROGRAM_TIERS.forEach((tier) => {
      const key =
        tier.id === "php"
          ? "PHP"
          : tier.id === "plus"
            ? "PHP_Plus"
            : "PHP_Premium";
      map.set(key, tier);
    });
    return map;
  }, []);

  const normalizeProgramOption = (option: string) => {
    const normalized = option.trim().toLowerCase();
    if (normalized.includes("premium")) return "PHP_Premium";
    if (normalized.includes("plus")) return "PHP_Plus";
    if (normalized.includes("php")) return "PHP";
    return null;
  };

  const formatBirthDate = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseBirthDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  return (
    <View className="gap-4 mb-8">
      {isAthleteStep && isVisible("athleteName") ? (
        <View>
          <View className={`flex-row items-center bg-input border ${errors.name ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}>
            <Feather name="user" size={20} color={errors.name ? colors.danger : colors.textSecondary} />
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 ml-3 text-app text-base font-outfit"
                  placeholder={labelFor("athleteName", "Athlete Name")}
                  placeholderTextColor={colors.placeholder}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="words"
                />
              )}
            />
          </View>
          <ErrorText text={errors.name?.message} />
        </View>
      ) : null}

      {isAthleteStep && isVisible("birthDate") ? (
        <View>
          <Controller
            control={control}
            name="birthDate"
            render={({ field: { onChange, value } }) => {
              const selectedDate = parseBirthDate(value ?? undefined);
              const displayValue = selectedDate ? selectedDate.toLocaleDateString() : "";
              return (
                <>
                  <Pressable
                    onPress={() => setShowBirthDatePicker(true)}
                    className={`flex-row items-center bg-input border ${errors.birthDate ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
                  >
                    <Feather name="calendar" size={20} color={errors.birthDate ? colors.danger : colors.textSecondary} />
                    <Text
                      className={`flex-1 ml-3 text-base font-outfit ${displayValue ? "text-app" : "text-secondary"}`}
                    >
                      {displayValue || labelFor("birthDate", "Birth date")}
                    </Text>
                  </Pressable>
                  {showBirthDatePicker ? (
                    <View className="mt-2">
                      <DateTimePicker
                        value={selectedDate ?? new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        maximumDate={new Date()}
                        onChange={(event, date) => {
                          if (Platform.OS !== "ios") {
                            setShowBirthDatePicker(false);
                          }
                          if (event.type === "dismissed") return;
                          if (!date) return;
                          onChange(formatBirthDate(date));
                        }}
                      />
                      {Platform.OS === "ios" ? (
                        <Pressable
                          onPress={() => setShowBirthDatePicker(false)}
                          className="mt-2 self-end rounded-full border border-app px-4 py-2"
                        >
                          <Text className="text-app font-outfit text-xs">Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </>
              );
            }}
          />
          <ErrorText text={errors.birthDate?.message} />
        </View>
      ) : null}

      {isAthleteStep && isVisible("team") ? (
        <View>
          {optionsFor("team").length ? (
            <View ref={teamTriggerRef} collapsable={false}>
              <Pressable onPress={() => onOpenDropdown("team")} className="flex-row items-center justify-between bg-input border border-app rounded-xl px-4 h-14">
                <Text className="text-app font-outfit text-base">{getValue("team") || "Select team"}</Text>
                <Feather name="chevron-down" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <View className={`flex-row items-center bg-input border ${errors.team ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}>
              <Feather name="users" size={20} color={errors.team ? colors.danger : colors.textSecondary} />
              <Controller
                control={control}
                name="team"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder={labelFor("team", "Team and Level")}
                    placeholderTextColor={colors.placeholder}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
          )}
          <ErrorText text={errors.team?.message} />
        </View>
      ) : null}

      {isAthleteStep && isVisible("level") ? (
        <View>
          {!teamValue ? (
            <View className="rounded-2xl border border-border bg-secondary/30 px-4 py-3">
              <Text className="text-xs text-secondary font-outfit">Select a team to see available levels.</Text>
            </View>
          ) : levelOptionsForTeam(teamValue).length ? (
            <View ref={levelTriggerRef} collapsable={false}>
              <Pressable onPress={() => onOpenDropdown("level")} className="flex-row items-center justify-between bg-input border border-app rounded-xl px-4 h-14">
                <Text className="text-app font-outfit text-base">{getValue("level") || "Select level"}</Text>
                <Feather name="chevron-down" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <View className="rounded-2xl border border-border bg-secondary/30 px-4 py-3">
              <Text className="text-xs text-secondary font-outfit">No levels configured for this team yet.</Text>
            </View>
          )}
        </View>
      ) : null}

      {isTrainingStep ? (
        <View>
          <View className={`flex-row items-center bg-input border ${errors.trainingDaysPerWeek ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}>
            <Feather name="activity" size={20} color={errors.trainingDaysPerWeek ? colors.danger : colors.textSecondary} />
            <Controller
              control={control}
              name="trainingDaysPerWeek"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 ml-3 text-app text-base font-outfit"
                  placeholder={labelFor("trainingPerWeek", "Training days per week")}
                  placeholderTextColor={colors.placeholder}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          <ErrorText text={errors.trainingDaysPerWeek?.message} />
        </View>
      ) : null}

      {isTrainingStep ? (
        <View>
          <View className={`flex-row items-center bg-input border ${errors.injuries ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}>
            <Feather name="alert-circle" size={20} color={errors.injuries ? colors.danger : colors.textSecondary} />
            <Controller
              control={control}
              name="injuries"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 ml-3 text-app text-base font-outfit"
                  placeholder={labelFor("injuries", "Current or previous injuries")}
                  placeholderTextColor={colors.placeholder}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          <ErrorText text={errors.injuries?.message} />
        </View>
      ) : null}

      {isTrainingStep ? (
        <View className="flex-row items-start pt-4 bg-input border border-app rounded-xl px-4 min-h-[56px] h-auto">
          <Feather name="file-text" size={20} color={colors.textSecondary} style={{ marginTop: 2 }} />
          <Controller
            control={control}
            name="growthNotes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="flex-1 ml-3 text-app text-base font-outfit leading-5"
                placeholder={labelFor("growthNotes", "Growth notes (optional)")}
                placeholderTextColor={colors.placeholder}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: "top" }}
              />
            )}
          />
        </View>
      ) : null}

      {isTrainingStep ? (
        <View>
          <View className={`flex-row items-start pt-4 bg-input border ${errors.performanceGoals ? "border-danger" : "border-app"} rounded-xl px-4 min-h-[56px] h-auto`}>
            <Feather name="target" size={20} color={errors.performanceGoals ? colors.danger : colors.textSecondary} style={{ marginTop: 2 }} />
            <Controller
              control={control}
              name="performanceGoals"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 ml-3 text-app text-base font-outfit leading-5"
                  placeholder={labelFor("performanceGoals", "Performance goals")}
                  placeholderTextColor={colors.placeholder}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: "top" }}
                />
              )}
            />
          </View>
          <ErrorText text={errors.performanceGoals?.message} />
        </View>
      ) : null}

      {isTrainingStep ? (
        <View>
          <View className={`flex-row items-center bg-input border ${errors.equipmentAccess ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}>
            <Feather name="tool" size={20} color={errors.equipmentAccess ? colors.danger : colors.textSecondary} />
            <Controller
              control={control}
              name="equipmentAccess"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 ml-3 text-app text-base font-outfit"
                  placeholder={labelFor("equipmentAccess", "Equipment access")}
                  placeholderTextColor={colors.placeholder}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          <ErrorText text={errors.equipmentAccess?.message} />
        </View>
      ) : null}

      {isGuardianStep ? (
        <View className="flex-row items-center bg-input border border-app rounded-xl px-4 h-14">
          <Feather name="phone" size={20} color={colors.textSecondary} />
          <Controller
            control={control}
            name="parentPhone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="flex-1 ml-3 text-app text-base font-outfit"
                placeholder={labelFor("parentPhone", "Guardian phone")}
                placeholderTextColor={colors.placeholder}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
              />
            )}
          />
        </View>
      ) : null}

      {isGuardianStep && isVisible("relationToAthlete") ? (
        <View className="flex-row flex-wrap gap-2">
          {optionsFor("relationToAthlete").map((option) => (
            <Pressable
              key={option}
              onPress={() => setValue("relationToAthlete", option)}
              className={`px-4 py-2 rounded-full border ${relationValue === option ? "border-accent bg-accent/10" : "border-app"}`}
            >
              <Text className="text-app font-outfit text-sm">{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {null}

      {isGuardianStep ? customFields.map((field) => (
        <View key={field.id}>
          {field.type === "dropdown" && field.options?.length ? (
            <View className="flex-row flex-wrap gap-2">
              {field.options.map((option) => (
                <Pressable
                  key={`${field.id}-${option}`}
                  onPress={() => setValue(field.id as never, option as never)}
                  className={`px-4 py-2 rounded-full border ${getValue(field.id) === option ? "border-accent bg-accent/10" : "border-app"}`}
                >
                  <Text className="text-app font-outfit text-sm">{option}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="bg-input border border-app rounded-xl px-4 h-14 justify-center">
              <Controller
                control={control}
                name={field.id as never}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="text-app text-base font-outfit"
                    placeholder={field.label}
                    placeholderTextColor={colors.placeholder}
                    onChangeText={onChange}
                    value={value ? String(value) : ""}
                  />
                )}
              />
            </View>
          )}
        </View>
      )) : null}

      {isGuardianStep ? (
        <Controller
          control={control}
          name="isChecked"
          render={({ field: { onChange, value } }) => (
            <View>
              <View className="flex-row items-center">
                <View
                  className={`w-6 h-6 rounded-md border items-center justify-center ${
                    value ? "bg-accent border-accent" : errors.isChecked ? "bg-input border-danger" : "bg-input border-app"
                  }`}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: value }}
                    className="w-6 h-6 items-center justify-center"
                    hitSlop={8}
                    onPress={() => onChange(!value)}
                  >
                    {value ? <Feather name="check" size={16} color="white" /> : null}
                  </Pressable>
                </View>
                <View className="ml-3 flex-1 flex-row flex-wrap items-center">
                  <Text className="text-secondary text-base font-outfit">
                    I agree to the{" "}
                  </Text>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={onOpenTerms}>
                    <Text className="text-accent font-outfit-semibold">
                      Terms of Service
                    </Text>
                  </Pressable>
                  <Text className="text-secondary text-base font-outfit">
                    {" "}and{" "}
                  </Text>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={onOpenPrivacy}>
                    <Text className="text-accent font-outfit-semibold">
                      Privacy Policy
                    </Text>
                  </Pressable>
                </View>
              </View>
              <ErrorText text={errors.isChecked?.message} />
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

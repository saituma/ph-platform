import { Checkbox } from "@/components/ui/checkbox";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Controller, Control, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";

import { AthleteRegisterFormData, ConfigField } from "@/hooks/onboarding/useRegisterController";

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
};

function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return <Text className="text-danger text-xs font-outfit ml-2 mt-1">{text}</Text>;
}

export function RegisterFormFields({
  control,
  errors,
  colors,
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
}: RegisterFormFieldsProps) {
  return (
    <View className="gap-4 mb-8">
      {isVisible("athleteName") ? (
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

      {isVisible("age") ? (
        <View>
          <View className={`flex-row items-center bg-input border ${errors.age ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}>
            <Feather name="calendar" size={20} color={errors.age ? colors.danger : colors.textSecondary} />
            <Controller
              control={control}
              name="age"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 ml-3 text-app text-base font-outfit"
                  placeholder={labelFor("age", "Age")}
                  placeholderTextColor={colors.placeholder}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          <ErrorText text={errors.age?.message} />
        </View>
      ) : null}

      {isVisible("team") ? (
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

      {isVisible("level") ? (
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

      {isVisible("relationToAthlete") ? (
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

      {isVisible("desiredProgramType") ? (
        <View className="flex-row flex-wrap gap-2">
          {optionsFor("desiredProgramType").map((option) => (
            <Pressable
              key={option}
              onPress={() => setValue("desiredProgramType", option)}
              className={`px-4 py-2 rounded-full border ${programValue === option ? "border-accent bg-accent/10" : "border-app"}`}
            >
              <Text className="text-app font-outfit text-sm">{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {customFields.map((field) => (
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
      ))}

      <Controller
        control={control}
        name="isChecked"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            checked={value}
            onChange={onChange}
            label={
              <Text className="text-app font-outfit text-base">
                I agree to the <Text onPress={onOpenTerms} className="text-accent font-bold">Terms of Service</Text> and{" "}
                <Text onPress={onOpenPrivacy} className="text-accent font-bold">Privacy Policy</Text>
              </Text>
            }
            error={errors.isChecked?.message}
          />
        )}
      />
    </View>
  );
}

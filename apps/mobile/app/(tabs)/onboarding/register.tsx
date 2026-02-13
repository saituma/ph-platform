import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { LegalModal, LegalSection } from "@/components/ui/LegalModal";
import { useRole } from "@/context/RoleContext";
import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import * as z from "zod";
import { apiRequest } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAthleteUserId, setOnboardingCompleted } from "@/store/slices/userSlice";

const athleteRegisterSchema = z
  .object({
  name: z.string().min(2, "Name is required"),
  age: z.string().min(1, "Age is required"),
  team: z.string().min(1, "Team is required"),
  trainingDaysPerWeek: z.string().min(1, "Training days is required"),
  injuries: z.string().min(1, "Injuries is required"),
  growthNotes: z.string().optional(),
  performanceGoals: z.string().min(1, "Performance goals is required"),
  equipmentAccess: z.string().min(1, "Equipment access is required"),
  parentPhone: z.string().optional(),
  relationToAthlete: z.string().optional(),
  desiredProgramType: z.string().optional(),
  isChecked: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and privacy policy",
  }),
  })
  .passthrough();

type AthleteRegisterFormData = z.infer<typeof athleteRegisterSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { setRole } = useRole();
  const dispatch = useAppDispatch();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [config, setConfig] = useState<any | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<"team" | "level" | null>(null);
  const [teamAnchor, setTeamAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [levelAnchor, setLevelAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const teamTriggerRef = useRef<View>(null);
  const levelTriggerRef = useRef<View>(null);
  const { token, profile } = useAppSelector((state) => state.user);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AthleteRegisterFormData>({
    resolver: zodResolver(athleteRegisterSchema),
    defaultValues: {
      name: "",
      age: "",
      team: "",
      trainingDaysPerWeek: "",
      injuries: "",
      growthNotes: "",
      performanceGoals: "",
      equipmentAccess: "",
      parentPhone: "",
      relationToAthlete: "Guardian",
      desiredProgramType: "PHP",
      isChecked: false,
    },
    mode: "onChange",
  });

  const fieldMap = useMemo(() => {
    if (!config?.fields) return {};
    return config.fields.reduce((acc: any, field: any) => {
      acc[field.id] = field;
      return acc;
    }, {});
  }, [config]);

  const visibleFields = useMemo(() => {
    if (!config?.fields) return [];
    return config.fields.filter((field: any) => field.visible !== false);
  }, [config]);

  const isVisible = (id: string) => {
    if (!config?.fields) return true;
    return visibleFields.some((field: any) => field.id === id);
  };

  const labelFor = (id: string, fallback: string) => {
    const field = fieldMap[id];
    return field?.label ?? fallback;
  };

  const optionsFor = (id: string) => {
    const field = fieldMap[id];
    return field?.options ?? [];
  };
  const levelOptionsForTeam = (team: string) => {
    const field = fieldMap["level"];
    const byTeam = field?.optionsByTeam ?? {};
    if (team && Array.isArray(byTeam?.[team]) && byTeam[team].length) {
      return byTeam[team];
    }
    return field?.options ?? [];
  };

  const relationValue = useWatch({ control, name: "relationToAthlete" }) ?? "";
  const programValue = useWatch({ control, name: "desiredProgramType" }) ?? "";
  const teamValue = useWatch({ control, name: "team" }) ?? "";
  const getValue = (name: string) => (control._formValues as any)?.[name] ?? "";
  const customFields = useMemo(() => {
    const known = new Set([
      "athleteName",
      "age",
      "team",
      "level",
      "trainingPerWeek",
      "trainingDaysPerWeek",
      "injuries",
      "growthNotes",
      "performanceGoals",
      "equipmentAccess",
      "parentEmail",
      "parentPhone",
      "relationToAthlete",
      "desiredProgramType",
    ]);
    return visibleFields.filter((field: any) => !known.has(field.id));
  }, [visibleFields]);

  const loadConfig = async (showSpinner = true) => {
    if (showSpinner) setConfigLoading(true);
    try {
      const response = await apiRequest("/onboarding/config", { method: "GET" });
      setConfig(response.config ?? null);
    } catch (error) {
      console.warn("Failed to load onboarding config", error);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadConfig();
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const options = levelOptionsForTeam(teamValue);
    const current = getValue("level");
    if (!teamValue && current) {
      setValue("level", "");
      return;
    }
    if (current && options.length && !options.includes(current)) {
      setValue("level", "");
    }
  }, [teamValue, config, setValue]);

  const openDropdown = (type: "team" | "level") => {
    const ref = type === "team" ? teamTriggerRef : levelTriggerRef;
    ref.current?.measureInWindow((x, y, width, height) => {
      const anchor = { x, y, width, height };
      if (type === "team") setTeamAnchor(anchor);
      else setLevelAnchor(anchor);
      setDropdownOpen(type);
    });
  };

  const onSubmit = async (data: AthleteRegisterFormData) => {
    setFormError(null);
    if (!token) {
      setFormError("Please log in again to complete onboarding.");
      return;
    }
    if (!profile.email) {
      setFormError("Missing guardian email.");
      return;
    }
    const requiredFields = (config?.fields ?? []).filter(
      (field: any) => field.visible !== false && field.required
    );
    for (const field of requiredFields) {
      if (field.id === "parentEmail") continue;
      const key =
        field.id === "trainingPerWeek"
          ? "trainingDaysPerWeek"
          : field.id === "athleteName"
          ? "name"
          : field.id;
      const value = (data as any)[key];
      if (value === undefined || value === null || value === "") {
        setFormError(`${field.label} is required.`);
        return;
      }
    }
    const ageValue = Number.parseInt(data.age, 10);
    const trainingValue = Math.round(Number(data.trainingDaysPerWeek));
    if (Number.isNaN(ageValue) || ageValue < 5) {
      setFormError("Age must be a whole number (5 or older).");
      return;
    }
    if (Number.isNaN(trainingValue) || trainingValue < 0) {
      setFormError("Training days must be a valid number.");
      return;
    }
    setIsSubmitting(true);
    try {
      const normalizedFields = (config?.fields ?? []).filter((field: any) => field.visible !== false);
      const extraResponses: Record<string, string> = {};
      normalizedFields.forEach((field: any) => {
        if (field.id === "athleteName") return;
        if (field.id === "age") return;
        if (field.id === "team") return;
        if (field.id === "trainingPerWeek") return;
        if (field.id === "trainingDaysPerWeek") return;
        if (field.id === "injuries") return;
        if (field.id === "growthNotes") return;
        if (field.id === "performanceGoals") return;
        if (field.id === "equipmentAccess") return;
        if (field.id === "parentEmail") return;
        if (field.id === "parentPhone") return;
        if (field.id === "relationToAthlete") return;
        if (field.id === "desiredProgramType") return;
        extraResponses[field.id] = (data as any)[field.id] ?? "";
      });

      const programTier = (data as any).desiredProgramType || config?.defaultProgramTier || "PHP";
      const relation = (data as any).relationToAthlete || "Guardian";
      const parentPhone = (data as any).parentPhone || undefined;

      await apiRequest("/onboarding", {
        method: "POST",
        token,
        body: {
          athleteName: data.name,
          age: ageValue,
          team: data.team,
          trainingPerWeek: trainingValue,
          injuries: data.injuries,
          growthNotes: data.growthNotes || null,
          performanceGoals: data.performanceGoals,
          equipmentAccess: data.equipmentAccess,
          parentEmail: profile.email,
          parentPhone,
          relationToAthlete: relation,
          desiredProgramType: programTier,
          termsVersion: "1.0",
          privacyVersion: "1.0",
          appVersion: "mobile-1.0",
          extraResponses,
        },
      });

      dispatch(setOnboardingCompleted(true));
      if (response?.athleteUserId) {
        dispatch(setAthleteUserId(response.athleteUserId));
      }
      setRole("Guardian");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Onboarding failed:", error);
      setFormError(error?.message ?? "Onboarding failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    console.log("Registration form errors:", errors);
  };

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-6 pt-4 mb-4">
        <Pressable
          onPress={() => router.navigate("/(tabs)/onboarding")}
          className="p-2 -ml-2 self-start"
        >
          <Feather
            name="arrow-left"
            size={24}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
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
            {profile?.name
              ? `Welcome, ${profile.name}`
              : config?.welcomeMessage || "Athlete Profile"}
          </Text>
          <Text className="text-base font-outfit text-secondary">
            {config?.coachMessage || "Enter your child's details to personalize their training plan."}
          </Text>
        </View>

        <View className="gap-4 mb-8">
          {configLoading ? (
            <Text className="text-secondary font-outfit">Loading form...</Text>
          ) : null}
          {isVisible("athleteName") ? (
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.name ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="user"
                size={20}
                color={errors.name ? colors.danger : colors.textSecondary}
              />
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
            {errors.name && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.name.message}
              </Text>
            )}
          </View>
          ) : null}

          {isVisible("age") ? (
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.age ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="calendar"
                size={20}
                color={errors.age ? colors.danger : colors.textSecondary}
              />
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
            {errors.age && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.age.message}
              </Text>
            )}
          </View>
          ) : null}

          {isVisible("team") ? (
          <View>
            {optionsFor("team").length ? (
              <View ref={teamTriggerRef} collapsable={false}>
                <Pressable
                  onPress={() => openDropdown("team")}
                  className="flex-row items-center justify-between bg-input border border-app rounded-xl px-4 h-14"
                >
                  <Text className="text-app font-outfit text-base">
                    {getValue("team") || "Select team"}
                  </Text>
                  <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <View
                className={`flex-row items-center bg-input border ${errors.team ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
              >
                <Feather
                  name="users"
                  size={20}
                  color={errors.team ? colors.danger : colors.textSecondary}
                />
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
            {errors.team && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.team.message}
              </Text>
            )}
          </View>
          ) : null}

          {isVisible("level") ? (
          <View>
            {!teamValue ? (
              <View className="rounded-2xl border border-border bg-secondary/30 px-4 py-3">
                <Text className="text-xs text-secondary font-outfit">
                  Select a team to see available levels.
                </Text>
              </View>
            ) : levelOptionsForTeam(teamValue).length ? (
              <View ref={levelTriggerRef} collapsable={false}>
                <Pressable
                  onPress={() => openDropdown("level")}
                  className="flex-row items-center justify-between bg-input border border-app rounded-xl px-4 h-14"
                >
                  <Text className="text-app font-outfit text-base">
                    {getValue("level") || "Select level"}
                  </Text>
                  <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <View className="rounded-2xl border border-border bg-secondary/30 px-4 py-3">
                <Text className="text-xs text-secondary font-outfit">
                  No levels configured for this team yet.
                </Text>
              </View>
            )}
          </View>
          ) : null}

          {isVisible("trainingPerWeek") || isVisible("trainingDaysPerWeek") ? (
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.trainingDaysPerWeek ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="activity"
                size={20}
                color={
                  errors.trainingDaysPerWeek
                    ? colors.danger
                    : colors.textSecondary
                }
              />
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
            {errors.trainingDaysPerWeek && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.trainingDaysPerWeek.message}
              </Text>
            )}
          </View>
          ) : null}

          {isVisible("injuries") ? (
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.injuries ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="alert-circle"
                size={20}
                color={
                  errors.injuries ? colors.danger : colors.textSecondary
                }
              />
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
            {errors.injuries && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.injuries.message}
              </Text>
            )}
          </View>
          ) : null}

          {isVisible("growthNotes") ? (
          <View className="flex-row items-start pt-4 bg-input border border-app rounded-xl px-4 min-h-[56px] h-auto">
            <Feather
              name="file-text"
              size={20}
              color={colors.textSecondary}
              style={{ marginTop: 2 }}
            />
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

          {isVisible("performanceGoals") ? (
          <View>
            <View
              className={`flex-row items-start pt-4 bg-input border ${errors.performanceGoals ? "border-danger" : "border-app"} rounded-xl px-4 min-h-[56px] h-auto`}
            >
              <Feather
                name="target"
                size={20}
                color={
                  errors.performanceGoals
                    ? colors.danger
                    : colors.textSecondary
                }
                style={{ marginTop: 2 }}
              />
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
            {errors.performanceGoals && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.performanceGoals.message}
              </Text>
            )}
          </View>
          ) : null}

          {isVisible("equipmentAccess") ? (
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.equipmentAccess ? "border-danger" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="tool"
                size={20}
                color={
                  errors.equipmentAccess
                    ? colors.danger
                    : colors.textSecondary
                }
              />
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
            {errors.equipmentAccess && (
              <Text className="text-danger text-xs font-outfit ml-2 mt-1">
                {errors.equipmentAccess.message}
              </Text>
            )}
          </View>
          ) : null}

          {isVisible("parentPhone") ? (
          <View>
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
          </View>
          ) : null}

          {isVisible("relationToAthlete") ? (
          <View>
            <View className="flex-row flex-wrap gap-2">
              {optionsFor("relationToAthlete").length
                ? optionsFor("relationToAthlete").map((option: string) => (
                    <Pressable
                      key={option}
                      onPress={() => setValue("relationToAthlete", option)}
                      className={`px-4 py-2 rounded-full border ${
                        relationValue === option ? "border-accent bg-accent/10" : "border-app"
                      }`}
                    >
                      <Text className="text-app font-outfit text-sm">{option}</Text>
                    </Pressable>
                  ))
                : null}
            </View>
          </View>
          ) : null}

          {isVisible("desiredProgramType") ? (
          <View>
            <View className="flex-row flex-wrap gap-2">
              {optionsFor("desiredProgramType").length
                ? optionsFor("desiredProgramType").map((option: string) => (
                    <Pressable
                      key={option}
                      onPress={() => setValue("desiredProgramType", option)}
                      className={`px-4 py-2 rounded-full border ${
                        programValue === option ? "border-accent bg-accent/10" : "border-app"
                      }`}
                    >
                      <Text className="text-app font-outfit text-sm">{option}</Text>
                    </Pressable>
                  ))
                : null}
            </View>
          </View>
          ) : null}

          {customFields.map((field: any) => (
            <View key={field.id}>
              {field.type === "dropdown" && field.options?.length ? (
                <View className="flex-row flex-wrap gap-2">
                  {field.options.map((option: string) => (
                    <Pressable
                      key={`${field.id}-${option}`}
                      onPress={() => setValue(field.id as any, option)}
                      className={`px-4 py-2 rounded-full border ${
                        getValue(field.id) === option
                          ? "border-accent bg-accent/10"
                          : "border-app"
                      }`}
                    >
                      <Text className="text-app font-outfit text-sm">{option}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="bg-input border border-app rounded-xl px-4 h-14 justify-center">
                  <Controller
                    control={control}
                    name={field.id}
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
                    I agree to the{" "}
                    <Text
                      onPress={() => setShowTerms(true)}
                      className="text-accent font-bold"
                    >
                      Terms of Service
                    </Text>{" "}
                    and{" "}
                    <Text
                      onPress={() => setShowPrivacy(true)}
                      className="text-accent font-bold"
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                }
                error={errors.isChecked?.message}
              />
            )}
          />
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit, onError)}
          className={`bg-accent h-14 rounded-xl items-center justify-center mb-8 w-full ${isSubmitting ? "opacity-70" : ""}`}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-lg font-outfit">
            {isSubmitting ? "Saving..." : "Complete Registration"}
          </Text>
        </Pressable>
        {formError ? (
          <Text className="text-danger text-xs font-outfit mb-6">
            {formError}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>

      <LegalModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
      >
        <View className="mb-6">
          <Text className="text-base font-outfit text-secondary mb-4">
            Last updated: February 05, 2024
          </Text>
          <Text className="text-base font-outfit text-secondary">
            By accessing or using the PHP Coaching application, you agree to be
            bound by these Terms of Service.
          </Text>
        </View>
        <LegalSection
          title="1. Agreement to Terms"
          content="By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app."
        />
        <LegalSection
          title="2. Eligibility"
          content="The app is designed for athletes and their guardians. Guardians are responsible for the management of minor accounts and all coaching bookings."
        />
        <LegalSection
          title="3. Coaching & Subscriptions"
          content="Subscriptions provide access to specific training tiers (PHP, Plus, Premium). Features and availability may vary based on your selected plan."
        />
        <LegalSection
          title="4. Safety & Liability"
          content="Physical training involves inherent risks. Users must ensure they are in proper physical condition before proceeding with any training program provided."
        />
        <LegalSection
          title="5. Termination"
          content="We reserve the right to suspend or terminate accounts that violate our community guidelines or fail to maintain valid subscriptions."
        />
      </LegalModal>

      <LegalModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
      >
        <View className="mb-6">
          <Text className="text-base font-outfit text-secondary mb-4">
            Last updated: February 05, 2024
          </Text>
          <Text className="text-base font-outfit text-secondary">
            Your privacy is important to us. This policy outlines how we
            collect, use, and protect your data.
          </Text>
        </View>
        <LegalSection
          title="1. Data We Collect"
          content="We collect personal information such as name, email, and training progress to provide a personalized coaching experience. For minor athletes, we only collect data with guardian consent."
        />
        <LegalSection
          title="2. How We Use Data"
          content="Your data is used to track athletic progress, manage schedules, and communicate important updates. We do not sell your personal information to third parties."
        />
        <LegalSection
          title="3. Storage & Security"
          content="We implement industry-standard security measures to protect your data. All sensitive communications and payments are encrypted."
        />
        <LegalSection
          title="4. Your Rights"
          content="You have the right to access, correct, or delete your personal data at any time through the Privacy & Security settings or by contacting support."
        />
        <LegalSection
          title="5. Policy Updates"
          content="We may update this policy occasionally. Continued use of the app after changes constitutes acceptance of the new terms."
        />
      </LegalModal>

      <Modal
        transparent
        animationType="fade"
        visible={dropdownOpen !== null}
        onRequestClose={() => setDropdownOpen(null)}
      >
        <Pressable className="flex-1 bg-transparent" onPress={() => setDropdownOpen(null)}>
          {(() => {
            const anchor = dropdownOpen === "team" ? teamAnchor : levelAnchor;
            if (!anchor) return null;
            const windowHeight = Dimensions.get("window").height;
            const preferredTop = anchor.y + anchor.height + 8;
            const maxHeight = Math.min(280, Math.max(160, windowHeight - preferredTop - 24));
            const placeAbove = windowHeight - preferredTop < 160;
            const top = placeAbove ? Math.max(24, anchor.y - 8 - maxHeight) : preferredTop;
            return (
              <Pressable
                className="absolute"
                style={{ top, left: anchor.x, width: anchor.width }}
                onPress={() => {}}
              >
                <View className="bg-input rounded-2xl border border-border shadow-xl overflow-hidden">
                  <ScrollView style={{ maxHeight }}>
                    <View className="gap-2 px-3 py-3">
                      {(dropdownOpen === "team"
                        ? optionsFor("team")
                        : levelOptionsForTeam(teamValue)
                      ).map((option: string) => (
                        <Pressable
                          key={`dropdown-${dropdownOpen}-${option}`}
                          onPress={() => {
                            if (dropdownOpen === "team") {
                              setValue("team", option);
                            } else {
                              setValue("level" as any, option);
                            }
                            setDropdownOpen(null);
                          }}
                          className="rounded-xl bg-secondary/40 px-4 py-3"
                        >
                          <Text className="text-app font-outfit text-sm">{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </Pressable>
            );
          })()}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

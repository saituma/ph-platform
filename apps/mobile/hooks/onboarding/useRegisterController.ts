
import { apiRequest, clearApiCache } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAthleteUserId, setOnboardingCompleted } from "@/store/slices/userSlice";
import { zodResolver } from "@hookform/resolvers/zod";
type RouterLike = { replace: (path: string) => void };
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import Constants from "expo-constants";

export type FieldType = "text" | "number" | "dropdown" | "date";

export type ConfigField = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  visible?: boolean;
  options?: string[];
  optionsByTeam?: Record<string, string[]>;
};

type RequiredDocument = {
  id: string;
  label: string;
  required?: boolean;
};

type OnboardingConfig = {
  fields?: ConfigField[];
  requiredDocuments?: RequiredDocument[];
  welcomeMessage?: string;
  coachMessage?: string;
  approvalWorkflow?: "manual" | "auto";
  phpPlusProgramTabs?: string[];
  termsVersion?: string;
  privacyVersion?: string;
};

const optionalText = () =>
  z.preprocess((val) => (typeof val === "string" && val.trim() === "" ? undefined : val), z.string().optional());

const athleteRegisterSchema = z
  .object({
    name: optionalText(),
    athleteType: optionalText(),
    birthDate: optionalText(),
    team: optionalText(),
    trainingDaysPerWeek: optionalText(),
    injuries: optionalText(),
    growthNotes: optionalText(),
    performanceGoals: optionalText(),
    equipmentAccess: optionalText(),
    parentPhone: optionalText(),
    relationToAthlete: optionalText(),
    desiredProgramType: optionalText(),
    isChecked: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and privacy policy",
    }),
  })
  .passthrough();

export type AthleteRegisterFormData = z.infer<typeof athleteRegisterSchema>;

export function useRegisterController(options?: { router?: RouterLike; mode?: string | string[] }) {
  const router = options?.router;
  const mode = Array.isArray(options?.mode) ? options?.mode[0] : options?.mode;
  const createNewAthlete = mode === "add";

  const dispatch = useAppDispatch();
  const { token, profile } = useAppSelector((state) => state.user);

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<"team" | "level" | null>(null);
  const [teamAnchor, setTeamAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [levelAnchor, setLevelAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [legalVersions, setLegalVersions] = useState<{ terms: string; privacy: string } | null>(null);

  const teamTriggerRef = useRef<View>(null);
  const levelTriggerRef = useRef<View>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    trigger,
    setError,
    clearErrors,
  } = useForm<AthleteRegisterFormData>({
    resolver: zodResolver(athleteRegisterSchema as any),
    defaultValues: {
      name: "",
      athleteType: "youth",
      birthDate: "",
      team: "",
      trainingDaysPerWeek: "",
      injuries: "",
      growthNotes: "",
      performanceGoals: "",
      equipmentAccess: "",
      parentPhone: "",
      isChecked: false,
    },
    mode: "onChange",
  });

  const normalizedFields = useMemo(() => {
    const fields = Array.isArray(config?.fields) ? config!.fields! : [];
    const hasBirthDate = fields.some((field) => field.id === "birthDate");
    const normalized = fields.map((field) => {
      if (field.id === "age" && !hasBirthDate) {
        return { ...field, id: "birthDate", label: field.label || "Birth Date", type: "date" as FieldType } as ConfigField;
      }
      return field as ConfigField;
    });
    const hasAthleteType = normalized.some((field) => field.id === "athleteType");
    if (hasAthleteType) return normalized;
    return [
      {
        id: "athleteType",
        label: "Athlete type",
        type: "dropdown" as FieldType,
        required: true,
        visible: true,
        options: ["youth", "adult"],
      },
      ...normalized,
    ];
  }, [config?.fields]);

  const visibleFields = useMemo(
    () => normalizedFields.filter((field) => field.visible !== false),
    [normalizedFields]
  );

  const fieldMap = useMemo(() => {
    return (normalizedFields ?? []).reduce<Record<string, ConfigField>>((acc, field) => {
      acc[field.id] = field;
      return acc;
    }, {});
  }, [normalizedFields]);

  const isVisible = useCallback(
    (id: string) => {
      if (!normalizedFields.length) return true;
      return visibleFields.some((field) => field.id === id);
    },
    [normalizedFields, visibleFields]
  );

  const labelFor = useCallback(
    (id: string, fallback: string) => fieldMap[id]?.label ?? fallback,
    [fieldMap]
  );

  const optionsFor = useCallback((id: string) => fieldMap[id]?.options ?? [], [fieldMap]);

  const levelOptionsForTeam = useCallback(
    (team: string) => {
      const field = fieldMap["level"];
      const byTeam = field?.optionsByTeam ?? {};
      if (team && Array.isArray(byTeam[team]) && byTeam[team].length) {
        return byTeam[team];
      }
      return field?.options ?? [];
    },
    [fieldMap]
  );

  const relationValue = useWatch({ control, name: "relationToAthlete" }) ?? "";
  const programValue = useWatch({ control, name: "desiredProgramType" }) ?? "";
  const teamValue = useWatch({ control, name: "team" }) ?? "";

  const getValue = useCallback(
    (name: string) => {
      const values = control._formValues as Record<string, unknown>;
      const value = values[name];
      return typeof value === "string" ? value : "";
    },
    [control._formValues]
  );

  const customFields = useMemo(() => {
    const known = new Set([
      "athleteName",
      "athleteType",
      "birthDate",
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
    return visibleFields.filter((field) => !known.has(field.id));
  }, [visibleFields]);

  const normalizeFieldKey = useCallback((fieldId: string) => {
    if (fieldId === "trainingPerWeek") return "trainingDaysPerWeek";
    if (fieldId === "athleteName") return "name";
    return fieldId;
  }, []);

  const loadConfig = useCallback(async (showSpinner = true, forceRefresh = false) => {
    if (showSpinner) setConfigLoading(true);
    try {
      const response = await apiRequest<{ config?: OnboardingConfig }>("/onboarding/config", {
        method: "GET",
        forceRefresh,
      });
      setConfig(response.config ?? null);
    } catch (error) {
      console.warn("Failed to load onboarding config", error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
  }, [getValue, levelOptionsForTeam, setValue, teamValue]);

  const openDropdown = useCallback((type: "team" | "level") => {
    const ref = type === "team" ? teamTriggerRef : levelTriggerRef;
    ref.current?.measureInWindow((x, y, width, height) => {
      const anchor = { x, y, width, height };
      if (type === "team") setTeamAnchor(anchor);
      else setLevelAnchor(anchor);
      setDropdownOpen(type);
    });
  }, []);

  const submit = useCallback(
    async (data: AthleteRegisterFormData) => {
      setFormError(null);
      if (!token) {
        setFormError("Please log in again to complete onboarding.");
        return;
      }
      if (!profile.email) {
        setFormError("Missing guardian email.");
        return;
      }

      const requiredFields = (normalizedFields ?? []).filter((field) => field.visible !== false && field.required);
      const fallbackRequired = [
        { id: "athleteName", label: "Athlete Name" },
        { id: "birthDate", label: "Birth date" },
        { id: "team", label: "Team" },
        { id: "trainingDaysPerWeek", label: "Training days" },
        { id: "injuries", label: "Injuries" },
        { id: "performanceGoals", label: "Performance goals" },
        { id: "equipmentAccess", label: "Equipment access" },
      ].filter((field) => isVisible(field.id));
      const requiredList = requiredFields.length ? requiredFields : fallbackRequired;

      clearErrors();
      for (const field of requiredList) {
        if (field.id === "parentEmail") continue;
        const key =
          normalizeFieldKey(field.id);
        const value = (data as Record<string, unknown>)[key];
        if (value === undefined || value === null || value === "") {
          setError(key as keyof AthleteRegisterFormData, {
            type: "required",
            message: `${field.label ?? labelFor(field.id, String(field.id))} is required.`,
          });
          setFormError(`${field.label ?? labelFor(field.id, String(field.id))} is required.`);
          return;
        }
      }

      const trainingValue = Math.round(Number(data.trainingDaysPerWeek));
      const birthDate = new Date(`${data.birthDate}T00:00:00Z`);
      if (Number.isNaN(birthDate.getTime())) {
        setFormError("Birth date must be valid.");
        return;
      }
      const ageValue = calculateAge(birthDate);
      if (ageValue < 5) {
        setFormError("Birth date must result in an age of 5 or older.");
        return;
      }
      if (Number.isNaN(trainingValue) || trainingValue < 0) {
        setFormError("Training days must be a valid number.");
        return;
      }

      setIsSubmitting(true);
      try {
        const normalizedVisibleFields = normalizedFields.filter((field) => field.visible !== false);
        const extraResponses: Record<string, string> = {};
        normalizedVisibleFields.forEach((field) => {
          const skip = new Set(["athleteName", "athleteType", "birthDate", "team", "level", "trainingPerWeek", "trainingDaysPerWeek", "injuries", "growthNotes", "performanceGoals", "equipmentAccess", "parentEmail", "parentPhone", "relationToAthlete", "desiredProgramType"]);
          if (skip.has(field.id)) return;
          extraResponses[field.id] = String((data as Record<string, unknown>)[field.id] ?? "");
        });

        const parentPhone = ((data as Record<string, unknown>).parentPhone as string) || undefined;

        const athleteTypeValue =
          data.athleteType === "adult" ? "adult" : "youth";
        if (athleteTypeValue === "adult" && ageValue < 18) {
          setFormError("Adult athletes must be 18 or older.");
          return;
        }
        if (athleteTypeValue === "youth" && ageValue >= 18) {
          setFormError("Youth athletes must be under 18.");
          return;
        }

        const teamValueForSubmit = data.team || "";

        const levelValue = ((data as Record<string, unknown>).level as string) || undefined;
        const relationToAthleteValue = data.relationToAthlete || undefined;
        const desiredProgramTypeValue = data.desiredProgramType || undefined;

        const response = await Promise.race([
          apiRequest<{ athleteUserId?: number }>("/onboarding", {
            method: "POST",
            token,
            body: {
              athleteName: data.name,
              athleteType: athleteTypeValue,
              birthDate: data.birthDate,
              team: teamValueForSubmit,
              level: levelValue,
              trainingPerWeek: trainingValue,
              injuries: data.injuries,
              growthNotes: data.growthNotes || null,
              performanceGoals: data.performanceGoals,
              equipmentAccess: data.equipmentAccess,
              parentEmail: profile.email,
              parentPhone,
              relationToAthlete: relationToAthleteValue,
              desiredProgramType: desiredProgramTypeValue,
              termsVersion: config?.termsVersion ?? "1.0",
              privacyVersion: config?.privacyVersion ?? "1.0",
              appVersion: Constants.expoConfig?.version ?? "mobile-unknown",
              extraResponses,
              createNew: createNewAthlete,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Registration is taking too long. Please try again.")), 15000)
          ),
        ]);

        dispatch(setOnboardingCompleted(true));
        if (response?.athleteUserId) {
          dispatch(setAthleteUserId(response.athleteUserId));
        }
        clearApiCache();

        if (__DEV__) {
          console.log("[Register] Onboarding submitted; navigating to tabs", {
            athleteUserId: response?.athleteUserId,
          });
        }
        router?.replace("/(tabs)");
      } catch (error) {
        console.error("Onboarding failed:", error);
        const message = error instanceof Error ? error.message : "Onboarding failed";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [config, createNewAthlete, dispatch, normalizeFieldKey, profile.email, router, token]
  );

  const validateStep = useCallback(
    async (step: number) => {
      setFormError(null);

      const stepFieldIds =
        step === 0
          ? ["athleteName", "athleteType", "birthDate", "team", "level"]
          : step === 1
            ? ["trainingPerWeek", "trainingDaysPerWeek", "injuries", "growthNotes", "performanceGoals", "equipmentAccess"]
            : ["parentPhone", ...customFields.map((field) => field.id), "isChecked"];

      const requiredFields = visibleFields.filter(
        (field) => field.required && stepFieldIds.includes(field.id)
      );

      const fallbackRequired =
        step === 0
          ? [
              { id: "athleteName", label: "Athlete Name" },
              { id: "athleteType", label: "Athlete type" },
              { id: "birthDate", label: "Birth date" },
              { id: "team", label: "Team" },
            ]
          : step === 1
            ? [
                { id: "trainingDaysPerWeek", label: "Training days" },
                { id: "injuries", label: "Injuries" },
                { id: "performanceGoals", label: "Performance goals" },
                { id: "equipmentAccess", label: "Equipment access" },
              ]
            : [{ id: "isChecked", label: "Terms and privacy agreement" }];

      const requiredList = requiredFields.length
        ? requiredFields
        : fallbackRequired.filter((field) => field.id === "isChecked" || isVisible(field.id));

      const values = getValues() as Record<string, unknown>;

      for (const field of requiredList) {
        if (field.id === "parentEmail") continue;
        const key = normalizeFieldKey(field.id);
        const value = values[key];
        const isEmpty =
          typeof value === "boolean"
            ? value !== true
            : value === undefined || value === null || String(value).trim() === "";

        if (isEmpty) {
          setError(key as keyof AthleteRegisterFormData, {
            type: "required",
            message: `${field.label ?? labelFor(field.id, String(field.id))} is required.`,
          });
          setFormError(`${field.label ?? labelFor(field.id, String(field.id))} is required.`);
          return false;
        }
      }

      const triggerFields = requiredList
        .map((field) => normalizeFieldKey(field.id))
        .filter((value, index, array) => array.indexOf(value) === index);

      if (triggerFields.length) {
        const isTriggeredValid = await trigger(triggerFields as any);
        if (!isTriggeredValid) {
          const firstKey = triggerFields.find((field) => {
            const error = (errors as Record<string, { message?: string }>)[field];
            return Boolean(error?.message);
          });
          const firstMessage = firstKey
            ? (errors as Record<string, { message?: string }>)[firstKey]?.message
            : undefined;
          setFormError(firstMessage ? String(firstMessage) : "Please complete the required fields.");
          return false;
        }
      }

      if (step === 0 && isVisible("birthDate")) {
        const birthDateValue = String(values.birthDate ?? "");
        const athleteTypeValue = String(values.athleteType ?? "youth");
        const birthDate = new Date(`${birthDateValue}T00:00:00Z`);
        if (!birthDateValue || Number.isNaN(birthDate.getTime())) {
          setError("birthDate", { type: "validate", message: "Birth date must be valid." });
          setFormError("Birth date must be valid.");
          return false;
        }
        const age = calculateAge(birthDate);
        if (age < 5) {
          setError("birthDate", { type: "validate", message: "Birth date must result in an age of 5 or older." });
          setFormError("Birth date must result in an age of 5 or older.");
          return false;
        }
        if (athleteTypeValue === "adult" && age < 18) {
          setError("birthDate", { type: "validate", message: "Adult athletes must be 18 or older." });
          setFormError("Adult athletes must be 18 or older.");
          return false;
        }
        if (athleteTypeValue !== "adult" && age >= 18) {
          setError("birthDate", { type: "validate", message: "Youth athletes must be under 18." });
          setFormError("Youth athletes must be under 18.");
          return false;
        }
      }

      if (step === 1 && isVisible("trainingDaysPerWeek")) {
        const trainingValue = Math.round(Number(values.trainingDaysPerWeek));
        if (Number.isNaN(trainingValue) || trainingValue < 0) {
          setError("trainingDaysPerWeek", { type: "validate", message: "Training days must be a valid number." });
          setFormError("Training days must be a valid number.");
          return false;
        }
      }

      return true;
    },
    [customFields, errors, getValues, isVisible, labelFor, normalizeFieldKey, setError, trigger, visibleFields]
  );

  const onSubmit = handleSubmit(submit, (invalid) => {
    const firstError = Object.values(invalid)[0];
    const message = firstError && "message" in firstError ? String(firstError.message) : "Please fix the highlighted fields.";
    setFormError(message);
  });

  const dropdownState = useMemo(() => {
    const anchor = dropdownOpen === "team" ? teamAnchor : levelAnchor;
    if (!anchor || !dropdownOpen) return null;
    const windowHeight = Dimensions.get("window").height;
    const preferredTop = anchor.y + anchor.height + 8;
    const maxHeight = Math.min(280, Math.max(160, windowHeight - preferredTop - 24));
    const placeAbove = windowHeight - preferredTop < 160;
    const top = placeAbove ? Math.max(24, anchor.y - 8 - maxHeight) : preferredTop;
    const options = dropdownOpen === "team" ? optionsFor("team") : levelOptionsForTeam(teamValue);
    return { anchor, top, maxHeight, options };
  }, [dropdownOpen, levelAnchor, levelOptionsForTeam, optionsFor, teamAnchor, teamValue]);

  return {
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
    validateStep,
    dropdownState,
  };
}

function calculateAge(birthDate: Date, asOf = new Date()) {
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();
  const currentYear = asOf.getUTCFullYear();
  const currentMonth = asOf.getUTCMonth();
  const currentDay = asOf.getUTCDate();
  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1;
  }
  return age;
}

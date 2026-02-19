import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
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

type OnboardingConfig = {
  fields?: ConfigField[];
  welcomeMessage?: string;
  coachMessage?: string;
  defaultProgramTier?: string;
};

const optionalText = () =>
  z.preprocess((val) => (typeof val === "string" && val.trim() === "" ? undefined : val), z.string().optional());

const athleteRegisterSchema = z
  .object({
    name: optionalText(),
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
  const { setRole } = useRole();
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
    setError,
    clearErrors,
  } = useForm<AthleteRegisterFormData>({
    resolver: zodResolver(athleteRegisterSchema),
    defaultValues: {
      name: "",
      birthDate: "",
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

  const normalizedFields = useMemo(() => {
    const fields = Array.isArray(config?.fields) ? config!.fields! : [];
    const hasBirthDate = fields.some((field) => field.id === "birthDate");
    return fields.map((field) => {
      if (field.id === "age" && !hasBirthDate) {
        return { ...field, id: "birthDate", label: field.label || "Birth Date", type: "date" };
      }
      return field;
    });
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

  const loadConfig = useCallback(async (showSpinner = true) => {
    if (showSpinner) setConfigLoading(true);
    try {
      const response = await apiRequest<{ config?: OnboardingConfig }>("/onboarding/config", { method: "GET" });
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
    let active = true;
    const loadLegal = async () => {
      if (!token) return;
      try {
        const response = await apiRequest<{ items?: any[] }>("/content/legal", { token, suppressStatusCodes: [401, 403] });
        if (!active) return;
        const items = response.items ?? [];
        const findLegal = (key: "terms" | "privacy") =>
          items.find((item: any) => String(item.category ?? "").toLowerCase() === key) ||
          items.find((item: any) => String(item.title ?? "").toLowerCase().includes(key));
        const terms = findLegal("terms");
        const privacy = findLegal("privacy");
        setLegalVersions({
          terms: String(terms?.content ?? "1.0"),
          privacy: String(privacy?.content ?? "1.0"),
        });
      } catch {
        if (!active) return;
        setLegalVersions(null);
      }
    };
    loadLegal();
    return () => {
      active = false;
    };
  }, [token]);

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
          field.id === "trainingPerWeek"
            ? "trainingDaysPerWeek"
            : field.id === "athleteName"
              ? "name"
              : field.id;
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
          const skip = new Set(["athleteName", "birthDate", "team", "trainingPerWeek", "trainingDaysPerWeek", "injuries", "growthNotes", "performanceGoals", "equipmentAccess", "parentEmail", "parentPhone", "relationToAthlete", "desiredProgramType"]);
          if (skip.has(field.id)) return;
          extraResponses[field.id] = String((data as Record<string, unknown>)[field.id] ?? "");
        });

        const programTier = String((data as Record<string, unknown>).desiredProgramType || config?.defaultProgramTier || "PHP");
        const relation = String((data as Record<string, unknown>).relationToAthlete || "Guardian");
        const parentPhone = ((data as Record<string, unknown>).parentPhone as string) || undefined;

        const teamValueForSubmit = data.team || (isVisible("team") ? "" : "Unknown");

        const response = await apiRequest<{ athleteUserId?: number }>("/onboarding", {
          method: "POST",
          token,
          body: {
            athleteName: data.name,
            birthDate: data.birthDate,
            team: teamValueForSubmit,
            trainingPerWeek: trainingValue,
            injuries: data.injuries,
            growthNotes: data.growthNotes || null,
            performanceGoals: data.performanceGoals,
            equipmentAccess: data.equipmentAccess,
            parentEmail: profile.email,
            parentPhone,
            relationToAthlete: relation,
            desiredProgramType: programTier,
            termsVersion: legalVersions?.terms ?? "1.0",
            privacyVersion: legalVersions?.privacy ?? "1.0",
            appVersion: Constants.expoConfig?.version ?? "mobile-unknown",
            extraResponses,
            createNew: createNewAthlete,
          },
        });

        dispatch(setOnboardingCompleted(true));
        if (response?.athleteUserId) {
          dispatch(setAthleteUserId(response.athleteUserId));
        }
        setRole("Guardian");
        router?.replace("/(tabs)");
      } catch (error) {
        console.error("Onboarding failed:", error);
        const message = error instanceof Error ? error.message : "Onboarding failed";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [config?.defaultProgramTier, config?.fields, createNewAthlete, dispatch, legalVersions, profile.email, router, setRole, token]
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

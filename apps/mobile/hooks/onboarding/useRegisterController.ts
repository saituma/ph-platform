import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAthleteUserId, setOnboardingCompleted } from "@/store/slices/userSlice";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

export type FieldType = "text" | "number" | "dropdown";

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

export type AthleteRegisterFormData = z.infer<typeof athleteRegisterSchema>;

export function useRegisterController() {
  const router = useRouter();
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

  const teamTriggerRef = useRef<View>(null);
  const levelTriggerRef = useRef<View>(null);

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

  const visibleFields = useMemo(() => (config?.fields ?? []).filter((field) => field.visible !== false), [config?.fields]);

  const fieldMap = useMemo(() => {
    return (config?.fields ?? []).reduce<Record<string, ConfigField>>((acc, field) => {
      acc[field.id] = field;
      return acc;
    }, {});
  }, [config?.fields]);

  const isVisible = useCallback(
    (id: string) => {
      if (!config?.fields) return true;
      return visibleFields.some((field) => field.id === id);
    },
    [config?.fields, visibleFields]
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

      const requiredFields = (config?.fields ?? []).filter((field) => field.visible !== false && field.required);
      for (const field of requiredFields) {
        if (field.id === "parentEmail") continue;
        const key = field.id === "trainingPerWeek" ? "trainingDaysPerWeek" : field.id === "athleteName" ? "name" : field.id;
        const value = (data as Record<string, unknown>)[key];
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
        const normalizedFields = (config?.fields ?? []).filter((field) => field.visible !== false);
        const extraResponses: Record<string, string> = {};
        normalizedFields.forEach((field) => {
          const skip = new Set(["athleteName", "age", "team", "trainingPerWeek", "trainingDaysPerWeek", "injuries", "growthNotes", "performanceGoals", "equipmentAccess", "parentEmail", "parentPhone", "relationToAthlete", "desiredProgramType"]);
          if (skip.has(field.id)) return;
          extraResponses[field.id] = String((data as Record<string, unknown>)[field.id] ?? "");
        });

        const programTier = String((data as Record<string, unknown>).desiredProgramType || config?.defaultProgramTier || "PHP");
        const relation = String((data as Record<string, unknown>).relationToAthlete || "Guardian");
        const parentPhone = ((data as Record<string, unknown>).parentPhone as string) || undefined;

        const response = await apiRequest<{ athleteUserId?: number }>("/onboarding", {
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
      } catch (error) {
        console.error("Onboarding failed:", error);
        const message = error instanceof Error ? error.message : "Onboarding failed";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [config?.defaultProgramTier, config?.fields, dispatch, profile.email, router, setRole, token]
  );

  const onSubmit = handleSubmit(submit, () => {
    setFormError("Please fix the highlighted fields.");
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

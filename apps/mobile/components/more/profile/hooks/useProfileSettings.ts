import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apiRequest } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateProfile } from "@/store/slices/userSlice";
import { registerDevicePushToken } from "@/lib/pushRegistration";

export type ManagedAthlete = {
  id?: number;
  name?: string | null;
  age?: number | null;
  team?: string | null;
  level?: string | null;
  trainingPerWeek?: number | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  injuries?: unknown;
  extraResponses?: unknown;
  profilePicture?: string | null;
};

type AthleteOnboardingData = {
  id: number;
  name?: string | null;
  birthDate?: string | null;
  team?: string | null;
  trainingPerWeek?: number | null;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  extraResponses?: Record<string, unknown>;
};

const normalizeToString = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const normalizeExtraResponses = (input: unknown): Record<string, string> => {
  if (typeof input !== "object" || input === null) return {};
  const obj = input as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    result[key] = normalizeToString(obj[key]);
  }
  return result;
};

export function useProfileSettings() {
  const dispatch = useAppDispatch();
  const { profile, token } = useAppSelector((state) => state.user);
  const pushRegistration = useAppSelector((state) => state.app.pushRegistration);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [managedAthletes, setManagedAthletes] = useState<ManagedAthlete[]>([]);
  const [managedAthleteCount, setManagedAthleteCount] = useState(0);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(null);

  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [position, setPosition] = useState("");

  const [athleteName, setAthleteName] = useState("");
  const [athleteBirthDate, setAthleteBirthDate] = useState("");
  const [athleteTeam, setAthleteTeam] = useState("");
  const [athleteTrainingPerWeek, setAthleteTrainingPerWeek] = useState("");
  const [athleteInjuries, setAthleteInjuries] = useState("");
  const [athleteGrowthNotes, setAthleteGrowthNotes] = useState("");
  const [athletePerformanceGoals, setAthletePerformanceGoals] = useState("");
  const [athleteEquipmentAccess, setAthleteEquipmentAccess] = useState("");
  const [athleteExtraResponses, setAthleteExtraResponses] = useState<Record<string, string>>({});
  const [hasLoadedAthleteDetails, setHasLoadedAthleteDetails] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(profile.name ?? "");
    setEmail(profile.email ?? "");
  }, [profile.name, profile.email]);

  useEffect(() => {
    if (!token) return;
    registerDevicePushToken({
      token,
      dispatch,
      requestPermission: false,
    }).then((result) => {
      if (result.expoPushToken) {
        setPushToken(result.expoPushToken);
      }
    });
  }, [dispatch, token]);

  const loadAthletes = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{
        guardian?: { activeAthleteId?: number | null } | null;
        athletes?: ManagedAthlete[];
      }>("/onboarding/athletes", { token });
      const athleteList = data.athletes ?? [];
      setManagedAthletes(athleteList);
      const activeAthlete =
        athleteList.find((item) => item.id === data.guardian?.activeAthleteId) ?? athleteList[0] ?? null;
      setActiveAthleteId(activeAthlete?.id ?? null);
      setManagedAthleteCount(athleteList.length);
    } catch {
      setManagedAthletes([]);
      setManagedAthleteCount(0);
    }
  }, [token]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  useEffect(() => {
    if (!token || !activeAthleteId) return;
    let active = true;
    setHasLoadedAthleteDetails(false);
    (async () => {
      try {
        const data = await apiRequest<{
          athlete?: AthleteOnboardingData | null;
        }>(`/onboarding/athletes/${activeAthleteId}`, {
          token,
          suppressStatusCodes: [401, 403, 404],
        });
        if (!active) return;
        const athlete = data.athlete ?? null;
        if (!athlete) return;

        setAthleteName(athlete.name ?? "");
        setAthleteBirthDate(athlete.birthDate ? normalizeToString(athlete.birthDate) : "");
        setAthleteTeam(athlete.team ?? "");
        setAthleteTrainingPerWeek(
          athlete.trainingPerWeek === null || athlete.trainingPerWeek === undefined
            ? ""
            : String(athlete.trainingPerWeek)
        );
        setAthleteInjuries(athlete.injuries ? normalizeToString(athlete.injuries) : "");
        setAthleteGrowthNotes(athlete.growthNotes ?? "");
        setAthletePerformanceGoals(athlete.performanceGoals ?? "");
        setAthleteEquipmentAccess(athlete.equipmentAccess ?? "");

        const extraMap = normalizeExtraResponses(athlete.extraResponses ?? {});
        setAthleteExtraResponses(extraMap);

        // Convenience fields commonly edited in-profile
        if (extraMap.height !== undefined) setHeight(extraMap.height);
        if (extraMap.weight !== undefined) setWeight(extraMap.weight);
        if (extraMap.position !== undefined) setPosition(extraMap.position);

        setHasLoadedAthleteDetails(true);
      } catch {
        // stay as is
      }
    })();
    return () => { active = false; };
  }, [token, activeAthleteId]);

  const setExtraResponseField = useCallback((key: string, value: string) => {
    setAthleteExtraResponses((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePickAvatar = async () => {
    if (!token || isUploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPendingAvatarUri(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!token) throw new Error("Authentication required");
    const fileName = uri.split("/").pop() ?? `avatar-${Date.now()}.jpg`;
    const contentType = "image/jpeg";
    const blob = await (await fetch(uri)).blob();
    const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
      method: "POST",
      token,
      body: { folder: "profile-photos", fileName, contentType, sizeBytes: blob.size },
    });
    await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    return presign.publicUrl;
  };

  const handleConfirmAvatar = async () => {
    if (!pendingAvatarUri || !token || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(pendingAvatarUri);
      const response = await apiRequest<{ user: { profilePicture?: string | null } }>("/auth/me", {
        method: "PATCH",
        token,
        body: { profilePicture: publicUrl },
      });
      dispatch(updateProfile({ avatar: response.user.profilePicture ?? publicUrl }));
      setPendingAvatarUri(null);
    } catch (error) {
      console.warn("Failed to update avatar", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!token || isSaving) return;
    setIsSaving(true);
    try {
      if (name !== profile.name) {
        const response = await apiRequest<{ user: { name?: string | null } }>("/auth/me", {
          method: "PATCH",
          token,
          body: { name },
        });
        dispatch(updateProfile({ name: response.user.name ?? name }));
      }
      if (activeAthleteId && hasLoadedAthleteDetails) {
        const trainingPerWeekValue = athleteTrainingPerWeek.trim() === "" ? undefined : Number(athleteTrainingPerWeek);
        const extraPatch: Record<string, unknown> = {
          ...Object.fromEntries(Object.entries(athleteExtraResponses).map(([key, value]) => [key, value])),
        };
        await apiRequest(`/onboarding/athletes/${activeAthleteId}`, {
          method: "PATCH",
          token,
          body: {
            name: athleteName.trim() || undefined,
            birthDate: athleteBirthDate.trim() || undefined,
            team: athleteTeam,
            trainingPerWeek: Number.isFinite(trainingPerWeekValue as any) ? (trainingPerWeekValue as number) : undefined,
            injuries: athleteInjuries.trim() ? athleteInjuries : null,
            growthNotes: athleteGrowthNotes.trim() ? athleteGrowthNotes : null,
            performanceGoals: athletePerformanceGoals.trim() ? athletePerformanceGoals : null,
            equipmentAccess: athleteEquipmentAccess.trim() ? athleteEquipmentAccess : null,
            extraResponses: extraPatch,
            height,
            weight,
            position,
          },
          suppressStatusCodes: [404],
        });
      }
      Alert.alert("Success", "Your changes have been saved.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message ?? "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPush = async () => {
    if (!token || isSendingTestPush) return;
    setIsSendingTestPush(true);
    try {
      await apiRequest("/notifications/test-push", { method: "POST", token });
      Alert.alert("Success", "Test notification sent!");
    } catch (err: any) {
      Alert.alert("Test Push Failed", err.message);
    } finally {
      setIsSendingTestPush(false);
    }
  };

  return {
    profile,
    pushRegistration,
    managedAthletes,
    managedAthleteCount,
    activeAthleteId,
    hasLoadedAthleteDetails,
    name,
    setName,
    email,
    pushToken,
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
    isSendingTestPush,
    isSaving,
    handlePickAvatar,
    handleConfirmAvatar,
    handleSave,
    handleTestPush,
  };
}

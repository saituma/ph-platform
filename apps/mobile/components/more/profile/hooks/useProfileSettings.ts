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
  injuries?: string | null;
  extraResponses?: string | null;
  profilePicture?: string | null;
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
    (async () => {
      try {
        const data = await apiRequest<{
          athlete?: {
            height?: string | null;
            weight?: string | null;
            position?: string | null;
          } | null;
        }>(`/onboarding/athletes/${activeAthleteId}`, {
          token,
          suppressStatusCodes: [401, 403, 404],
        });
        if (!active) return;
        if (data.athlete) {
          setHeight(data.athlete.height ?? "");
          setWeight(data.athlete.weight ?? "");
          setPosition(data.athlete.position ?? "");
        }
      } catch {
        // stay as is
      }
    })();
    return () => { active = false; };
  }, [token, activeAthleteId]);

  const handlePickAvatar = async () => {
    if (!token || isUploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      if (activeAthleteId) {
        await apiRequest(`/onboarding/athletes/${activeAthleteId}`, {
          method: "PATCH",
          token,
          body: { height, weight, position },
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
    name,
    setName,
    email,
    pushToken,
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

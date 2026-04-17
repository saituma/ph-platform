import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
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

export function useProfileSettings() {
  const dispatch = useAppDispatch();
  const { profile, token } = useAppSelector((state) => state.user);
  const pushRegistration = useAppSelector((state) => state.app.pushRegistration);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUriRaw] = useState<string | null>(null);
  const [pendingAvatarSizeBytes, setPendingAvatarSizeBytes] = useState<number | null>(null);
  const [pendingAvatarMimeType, setPendingAvatarMimeType] = useState<string | null>(null);
  const setPendingAvatarUri = useCallback((next: string | null) => {
    setPendingAvatarUriRaw(next);
    if (!next) {
      setPendingAvatarSizeBytes(null);
      setPendingAvatarMimeType(null);
    }
  }, []);
  const [managedAthletes, setManagedAthletes] = useState<ManagedAthlete[]>([]);
  const [managedAthleteCount, setManagedAthleteCount] = useState(0);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(null);

  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");

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

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    let sizeBytes = asset.fileSize ?? 0;
    try {
      const info = await FileSystem.getInfoAsync(asset.uri);
      const fsSize = info.exists ? (info.size ?? 0) : 0;
      sizeBytes = fsSize || sizeBytes;
    } catch {
      // ignore
    }
    if (!sizeBytes || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      sizeBytes = 512000;
    }

    setPendingAvatarMimeType(mimeType);
    setPendingAvatarSizeBytes(Math.trunc(sizeBytes));
    setPendingAvatarUri(asset.uri);
  };

  const uploadAvatar = async (uri: string, input: { sizeBytes: number; contentType: string }) => {
    if (!token) throw new Error("Authentication required");
    const ext = (() => {
      const ct = input.contentType.toLowerCase();
      if (ct.includes("png")) return "png";
      if (ct.includes("webp")) return "webp";
      if (ct.includes("heic")) return "heic";
      return "jpg";
    })();
    const fileName = `avatar-${Date.now()}-${Crypto.randomUUID()}.${ext}`;

    const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
      method: "POST",
      token,
      body: { folder: "profile-photos", fileName, contentType: input.contentType, sizeBytes: input.sizeBytes },
    });

    try {
      const result = await FileSystem.uploadAsync(presign.uploadUrl, uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": input.contentType },
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed (${result.status}).`);
      }
    } catch (err) {
      try {
        const blob = await (await fetch(uri)).blob();
        const res = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": input.contentType },
          body: blob,
        });
        if (!res.ok) {
          throw new Error(`Upload failed (${res.status}).`);
        }
      } catch {
        throw err instanceof Error ? err : new Error("Upload failed.");
      }
    }

    return presign.publicUrl;
  };

  const handleConfirmAvatar = async () => {
    if (!pendingAvatarUri || !token || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    try {
      const sizeBytes = pendingAvatarSizeBytes ?? 512000;
      const contentType = pendingAvatarMimeType ?? "image/jpeg";
      const publicUrl = await uploadAvatar(pendingAvatarUri, { sizeBytes, contentType });
      const response = await apiRequest<{ user: { profilePicture?: string | null } }>("/auth/me", {
        method: "PATCH",
        token,
        body: { profilePicture: publicUrl },
      });
      dispatch(updateProfile({ avatar: response.user.profilePicture ?? publicUrl }));
      setPendingAvatarUri(null);
    } catch (error) {
      console.warn("Failed to update avatar", error);
      const message = error instanceof Error ? error.message : "Upload failed.";
      Alert.alert("Upload Failed", message);
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

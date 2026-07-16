import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutAnimation } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
import { requestMediaLibraryPermission, safeLaunchImagePicker } from "@/lib/media/safeLaunchImagePicker";

export const MAX_MEAL_PHOTOS = 5;
const MAX_PHOTO_WIDTH = 1600;

export type DraftMealPhoto = {
  localId: string;
  /** Local uri for instant thumbnail display (original at first, compressed once ready). */
  uri: string;
  status: "processing" | "uploading" | "done" | "error";
  /** Upload progress 0..1 while status is "uploading". */
  progress: number;
  publicUrl: string | null;
};

function animatePhotoList() {
  LayoutAnimation.configureNext({
    duration: 220,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}

/**
 * Draft photo list for one meal being edited. Photos upload immediately on pick
 * (compressed + re-encoded to JPEG, which also strips EXIF/GPS), so saving the
 * meal only sends the already-uploaded public URLs.
 */
export function useMealPhotos() {
  const { token } = useAppSelector((s) => s.user);
  const [photos, setPhotos] = useState<DraftMealPhoto[]>([]);
  // Skip setState on drafts whose upload settles after reset() (modal closed / slot switched).
  const generationRef = useRef(0);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
    };
  }, []);

  const reset = useCallback((existingUrls: string[] = []) => {
    generationRef.current += 1;
    setPhotos(
      existingUrls.slice(0, MAX_MEAL_PHOTOS).map((url) => ({
        localId: `existing_${Crypto.randomUUID()}`,
        uri: url,
        status: "done" as const,
        progress: 1,
        publicUrl: url,
      })),
    );
  }, []);

  // Lazy import: expo-image-manipulator is a native module that older installed
  // builds don't ship. If it's unavailable, upload the original photo instead of
  // crashing the whole nutrition module graph (same pattern as lib/notifications).
  const compressPhoto = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    try {
      const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
      const context = ImageManipulator.manipulate(asset.uri);
      if (asset.width && asset.width > MAX_PHOTO_WIDTH) {
        context.resize({ width: MAX_PHOTO_WIDTH, height: null });
      }
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
      return saved.uri;
    } catch {
      return asset.uri;
    }
  }, []);

  const uploadPhoto = useCallback(
    async (uri: string, onProgress: (ratio: number) => void): Promise<string> => {
      if (!token) throw new Error("Authentication required");
      let sizeBytes = 0;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        sizeBytes = info.exists ? (info.size ?? 0) : 0;
      } catch {
        // ignore
      }
      if (!sizeBytes || sizeBytes <= 0) sizeBytes = 512000;

      const fileName = `meal-${Date.now()}-${Crypto.randomUUID()}.jpg`;
      const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
        method: "POST",
        token,
        body: { folder: "food-diary", fileName, contentType: "image/jpeg", sizeBytes: Math.trunc(sizeBytes) },
      });

      const uploadTask = FileSystem.createUploadTask(
        presign.uploadUrl,
        uri,
        {
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": "image/jpeg" },
        },
        (event) => {
          const expected = event.totalBytesExpectedToSend ?? 0;
          if (expected > 0) {
            onProgress(Math.max(0, Math.min(1, (event.totalBytesSent ?? 0) / expected)));
          }
        },
      );
      const result = await uploadTask.uploadAsync();
      if (!result) throw new Error("Upload canceled.");
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed (${result.status}).`);
      }
      return presign.publicUrl;
    },
    [token],
  );

  const startUpload = useCallback(
    (localId: string, uri: string) => {
      const generation = generationRef.current;
      const patch = (update: Partial<DraftMealPhoto>) => {
        if (generationRef.current !== generation) return;
        setPhotos((prev) => prev.map((photo) => (photo.localId === localId ? { ...photo, ...update } : photo)));
      };
      patch({ status: "uploading", progress: 0 });
      // Only re-render on whole-percent changes, not on every byte-count event.
      let lastPercent = -1;
      void uploadPhoto(uri, (progress) => {
        const percent = Math.round(progress * 100);
        if (percent === lastPercent) return;
        lastPercent = percent;
        patch({ progress });
      })
        .then((publicUrl) => {
          patch({ status: "done", progress: 1, publicUrl });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        })
        .catch(() => {
          patch({ status: "error" });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        });
    },
    [uploadPhoto],
  );

  // The tile shows the ORIGINAL photo the instant it's picked ("Preparing…"),
  // then compression swaps the uri and the upload reports live percent. Never
  // leave the user staring at a screen that hasn't reacted to their pick.
  const addAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      const generation = generationRef.current;
      const localId = `photo_${Crypto.randomUUID()}`;
      animatePhotoList();
      let added = false;
      setPhotos((prev) => {
        if (prev.length >= MAX_MEAL_PHOTOS) return prev;
        added = true;
        return [...prev, { localId, uri: asset.uri, status: "processing" as const, progress: 0, publicUrl: null }];
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

      const uri = await compressPhoto(asset);
      if (!added || generationRef.current !== generation) return;
      setPhotos((prev) => prev.map((photo) => (photo.localId === localId ? { ...photo, uri } : photo)));
      startUpload(localId, uri);
    },
    [compressPhoto, startUpload],
  );

  // Native pickers must never be launched twice concurrently (Android crashes).
  const pickingRef = useRef(false);

  const addFromLibrary = useCallback(async () => {
    if (!token || photos.length >= MAX_MEAL_PHOTOS || pickingRef.current) return;
    pickingRef.current = true;
    try {
      if (!(await requestMediaLibraryPermission())) return;
      const result = await safeLaunchImagePicker(() =>
        ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.9, allowsEditing: false }),
      );
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await addAsset(result.assets[0]);
    } catch (error) {
      console.warn("Failed to pick meal photo", error);
    } finally {
      pickingRef.current = false;
    }
  }, [addAsset, photos.length, token]);

  const addFromCamera = useCallback(async () => {
    if (!token || photos.length >= MAX_MEAL_PHOTOS || pickingRef.current) return;
    pickingRef.current = true;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await safeLaunchImagePicker(() =>
        ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.9, allowsEditing: false }),
      );
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await addAsset(result.assets[0]);
    } catch (error) {
      console.warn("Failed to take meal photo", error);
    } finally {
      pickingRef.current = false;
    }
  }, [addAsset, photos.length, token]);

  const retry = useCallback(
    (localId: string) => {
      const photo = photos.find((entry) => entry.localId === localId);
      if (!photo || photo.status !== "error") return;
      startUpload(localId, photo.uri);
    },
    [photos, startUpload],
  );

  const remove = useCallback((localId: string) => {
    animatePhotoList();
    setPhotos((prev) => prev.filter((photo) => photo.localId !== localId));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const isUploading = photos.some((photo) => photo.status === "processing" || photo.status === "uploading");
  const hasFailed = photos.some((photo) => photo.status === "error");
  const uploadedUrls = photos.filter((photo) => photo.publicUrl).map((photo) => photo.publicUrl as string);

  return { photos, reset, addFromLibrary, addFromCamera, retry, remove, isUploading, hasFailed, uploadedUrls };
}

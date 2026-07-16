import { useCallback, useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
import { requestMediaLibraryPermission, safeLaunchImagePicker } from "@/lib/media/safeLaunchImagePicker";

export const MAX_MEAL_PHOTOS = 5;
const MAX_PHOTO_WIDTH = 1600;

export type DraftMealPhoto = {
  localId: string;
  /** Local (compressed) uri for instant thumbnail display. */
  uri: string;
  status: "uploading" | "done" | "error";
  publicUrl: string | null;
};

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
        publicUrl: url,
      })),
    );
  }, []);

  const compressPhoto = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width && asset.width > MAX_PHOTO_WIDTH) {
      context.resize({ width: MAX_PHOTO_WIDTH, height: null });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    return saved.uri;
  }, []);

  const uploadPhoto = useCallback(
    async (uri: string): Promise<string> => {
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

      const result = await FileSystem.uploadAsync(presign.uploadUrl, uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": "image/jpeg" },
      });
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
      setPhotos((prev) =>
        prev.map((photo) => (photo.localId === localId ? { ...photo, status: "uploading" as const } : photo)),
      );
      void uploadPhoto(uri)
        .then((publicUrl) => {
          if (generationRef.current !== generation) return;
          setPhotos((prev) =>
            prev.map((photo) =>
              photo.localId === localId ? { ...photo, status: "done" as const, publicUrl } : photo,
            ),
          );
        })
        .catch(() => {
          if (generationRef.current !== generation) return;
          setPhotos((prev) =>
            prev.map((photo) => (photo.localId === localId ? { ...photo, status: "error" as const } : photo)),
          );
        });
    },
    [uploadPhoto],
  );

  const addAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      let uri = asset.uri;
      try {
        uri = await compressPhoto(asset);
      } catch {
        // Fall back to the original — a larger upload beats losing the photo.
      }
      const localId = `photo_${Crypto.randomUUID()}`;
      setPhotos((prev) =>
        prev.length >= MAX_MEAL_PHOTOS
          ? prev
          : [...prev, { localId, uri, status: "uploading" as const, publicUrl: null }],
      );
      startUpload(localId, uri);
    },
    [compressPhoto, startUpload],
  );

  const addFromLibrary = useCallback(async () => {
    if (!token || photos.length >= MAX_MEAL_PHOTOS) return;
    try {
      if (!(await requestMediaLibraryPermission())) return;
      const result = await safeLaunchImagePicker(() =>
        ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.9, allowsEditing: false }),
      );
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await addAsset(result.assets[0]);
    } catch (error) {
      console.warn("Failed to pick meal photo", error);
    }
  }, [addAsset, photos.length, token]);

  const addFromCamera = useCallback(async () => {
    if (!token || photos.length >= MAX_MEAL_PHOTOS) return;
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
    setPhotos((prev) => prev.filter((photo) => photo.localId !== localId));
  }, []);

  const isUploading = photos.some((photo) => photo.status === "uploading");
  const hasFailed = photos.some((photo) => photo.status === "error");
  const uploadedUrls = photos.filter((photo) => photo.publicUrl).map((photo) => photo.publicUrl as string);

  return { photos, reset, addFromLibrary, addFromCamera, retry, remove, isUploading, hasFailed, uploadedUrls };
}

import * as FileSystem from "expo-file-system";
import { Image, Platform } from "react-native";

export type StoryMediaPrefetchItem = {
  id?: string | null;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
};

type PrefetchOptions = {
  startIndex?: number;
  itemCount?: number;
  maxVideos?: number;
};

const inFlightVideoDownloads = new Map<string, Promise<string | null>>();

const normalizeUrl = (value?: string | null) => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length ? trimmed : null;
};

const hashUrl = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const getVideoCacheUri = (url: string) => {
  const baseUrl = url.split("?")[0];
  return `${FileSystem.cacheDirectory}video_${hashUrl(baseUrl)}.mp4`;
};

async function prefetchVideo(url: string) {
  if (!FileSystem.cacheDirectory || Platform.OS === "web") {
    return null;
  }

  const cachedFileUri = getVideoCacheUri(url);
  const existingRequest = inFlightVideoDownloads.get(cachedFileUri);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory as string);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory as string, {
          intermediates: true,
        });
      }

      const fileInfo = await FileSystem.getInfoAsync(cachedFileUri);
      if (fileInfo.exists) {
        return cachedFileUri;
      }

      const downloadResumable = FileSystem.createDownloadResumable(url, cachedFileUri);
      const result = await downloadResumable.downloadAsync();
      return result?.uri ?? null;
    } catch {
      return null;
    } finally {
      inFlightVideoDownloads.delete(cachedFileUri);
    }
  })();

  inFlightVideoDownloads.set(cachedFileUri, request);
  return request;
}

export async function prefetchStoryMedia(
  items: StoryMediaPrefetchItem[],
  options: PrefetchOptions = {},
) {
  if (!Array.isArray(items) || items.length === 0) return;

  const startIndex = Math.max(0, options.startIndex ?? 0);
  const itemCount = Math.max(1, options.itemCount ?? 3);
  const maxVideos = Math.max(0, options.maxVideos ?? 1);
  const selectedItems = items.slice(startIndex, startIndex + itemCount);

  const imageUrls = new Set<string>();
  const videoUrls: string[] = [];

  for (const item of selectedItems) {
    const imageUrl = normalizeUrl(item.imageUrl);
    const mediaUrl = normalizeUrl(item.mediaUrl);
    if (imageUrl) imageUrls.add(imageUrl);

    if (item.mediaType === "video") {
      if (mediaUrl && !videoUrls.includes(mediaUrl)) {
        videoUrls.push(mediaUrl);
      }
      continue;
    }

    if (mediaUrl) {
      imageUrls.add(mediaUrl);
    }
  }

  await Promise.allSettled(
    [...imageUrls].map((url) => Image.prefetch(url)),
  );

  for (const url of videoUrls.slice(0, maxVideos)) {
    await prefetchVideo(url);
  }
}

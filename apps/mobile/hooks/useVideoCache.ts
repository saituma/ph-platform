import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Hook to cache a video file locally.
 * If the URL changes, it re-downloads the video.
 */
export function useVideoCache(
  url: string | null | undefined,
  cacheKey?: string | null,
) {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [isCaching, setIsCaching] = useState(false);

  const hashUrl = (value: string) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 33) ^ value.charCodeAt(i);
    }
    // Convert to unsigned 32-bit hex
    return (hash >>> 0).toString(16);
  };

  useEffect(() => {
    if (!url) {
      setCachedUri(null);
      return;
    }

    // Skip caching for local files (recorded videos, etc.)
    if (url.startsWith('file://')) {
      setCachedUri(url);
      return;
    }

    let isMounted = true;

    async function cacheVideo() {
      if (!url) return;
      try {
        setIsCaching(true);
        
        const baseUrl = url.split("?")[0];
        const key = cacheKey ? `${cacheKey}:${baseUrl}` : baseUrl;
        // Create a unique filename based on a hash of the key to avoid collisions
        const fileName = `video_${hashUrl(key)}.mp4`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        // Ensure the directory exists (though cacheDirectory usually does, it's safe)
        const dirInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory as string);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory as string, { intermediates: true });
        }

        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (fileInfo.exists) {
          if (isMounted) {
            setCachedUri(fileUri);
            setIsCaching(false);
          }
          return;
        }

        // Download the video
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri,
          {},
          (downloadProgress) => {
            // Optional: Handle progress
          }
        );

        const result = await downloadResumable.downloadAsync();
        
        if (result && isMounted) {
          setCachedUri(result.uri);
        }
      } catch (error) {
        console.error('[useVideoCache] Error caching video:', error);
        // Fallback to original URL on error
        if (isMounted) setCachedUri(url);
      } finally {
        if (isMounted) setIsCaching(false);
      }
    }

    cacheVideo();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { cachedUri, isCaching };
}

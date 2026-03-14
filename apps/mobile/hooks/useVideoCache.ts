import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system';

/**
 * Hook to cache a video file locally.
 * If the URL changes, it re-downloads the video.
 */
export function useVideoCache(url: string | null | undefined) {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [isCaching, setIsCaching] = useState(false);

  useEffect(() => {
    if (!url) {
      setCachedUri(null);
      return;
    }

    let isMounted = true;

    async function cacheVideo() {
      if (!url) return;
      try {
        setIsCaching(true);
        
        // Create a unique filename based on the URL (sanitize to avoid slashes)
        const sanitizedFilename = url.replace(/[^a-z0-9]/gi, '_').substring(0, 100) + '.mp4';
        const fileUri = `${FileSystem.cacheDirectory}${sanitizedFilename}`;

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

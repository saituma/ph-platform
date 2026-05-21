import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

// Module-level registry — survives component unmounts within the same app session.
// Maps url-hash → local file URI. Provides synchronous cache hits for re-mounts.
const knownCachedFiles = new Map<string, string>();

function hashUrl(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function getFilePath(url: string, cacheKey?: string | null): string {
  const baseUrl = url.split('?')[0];
  const key = cacheKey ? `${cacheKey}:${baseUrl}` : baseUrl;
  return `${FileSystem.cacheDirectory}video_${hashUrl(key)}.mp4`;
}

function getMemoryKey(url: string, cacheKey?: string | null): string {
  const baseUrl = url.split('?')[0];
  return cacheKey ? `${cacheKey}:${baseUrl}` : baseUrl;
}

/**
 * Returns a local file URI for the given remote video URL.
 *
 * Strategy:
 * - If we already know the file is on disk (in-memory map), return it
 *   synchronously via useState initializer — zero re-render, no source switch.
 * - Otherwise start as null (player streams from network), check disk async
 *   (fast ~20ms), then either resolve from disk or download in the background
 *   WITHOUT updating cachedUri during playback. This prevents expo-video from
 *   creating a new player instance mid-play.
 * - On the next mount the in-memory map has the entry → instant local playback.
 */
export function useVideoCache(
  url: string | null | undefined,
  cacheKey?: string | null,
) {
  const [cachedUri, setCachedUri] = useState<string | null>(() => {
    if (!url) return null;
    // Skip for on-device URIs
    const lower = url.toLowerCase();
    if (
      url.startsWith('file://') ||
      url.startsWith('content://') ||
      url.startsWith('ph://') ||
      url.startsWith('asset://') ||
      lower.startsWith('blob:')
    ) return url;

    const memKey = getMemoryKey(url, cacheKey);
    return knownCachedFiles.get(memKey) ?? null;
  });

  useEffect(() => {
    if (!url) {
      setCachedUri(null);
      return;
    }

    const lower = url.toLowerCase();
    if (
      url.startsWith('file://') ||
      url.startsWith('content://') ||
      url.startsWith('ph://') ||
      url.startsWith('asset://') ||
      lower.startsWith('blob:')
    ) {
      setCachedUri(url);
      return;
    }

    const memKey = getMemoryKey(url, cacheKey);

    // Already resolved in this session — nothing to do
    if (knownCachedFiles.has(memKey)) return;

    let cancelled = false;
    const filePath = getFilePath(url, cacheKey);

    async function init() {
      // Fast disk check (~20-50ms) — catches files cached in prior sessions
      try {
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists) {
          knownCachedFiles.set(memKey, filePath);
          if (!cancelled) setCachedUri(filePath);
          return;
        }
      } catch {
        // getInfoAsync failure is non-fatal; fall through to download
      }

      // File not on disk — download in background WITHOUT touching cachedUri.
      // The player is already streaming from the network URL. Updating cachedUri
      // here would cause expo-video to rebuild its player (visible stutter).
      // The cached file will be used on the NEXT mount via the memory map.
      try {
        const result = await FileSystem.createDownloadResumable(
          url!,
          filePath,
        ).downloadAsync();
        if (result && !cancelled) {
          knownCachedFiles.set(memKey, filePath);
          // Don't call setCachedUri — avoids mid-playback source switch.
        }
      } catch {
        // Silent fail — network playback continues unaffected.
      }
    }

    init();
    return () => { cancelled = true; };
  }, [url, cacheKey]);

  return { cachedUri };
}

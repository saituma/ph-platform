import { useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

// Module-level registry: url-hash → local file URI.
// Survives component unmounts within the same app session.
// Provides synchronous cache hits on re-mounts (zero re-render overhead).
const knownCachedFiles = new Map<string, string>();

// Track in-progress downloads so multiple players for the same URL share one download.
const activeDownloads = new Map<string, Promise<void>>();

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

function isLocalUri(url: string): boolean {
  return (
    url.startsWith('file://') ||
    url.startsWith('content://') ||
    url.startsWith('ph://') ||
    url.startsWith('asset://') ||
    url.toLowerCase().startsWith('blob:')
  );
}

/**
 * TikTok/YouTube-style video cache.
 *
 * Strategy:
 * 1. Sync memory hit  → returns local URI in useState init (zero re-render).
 * 2. Disk hit         → async disk check (~20ms) → updates cachedUri to local path.
 *                       The source switch happens before the user has interacted —
 *                       expo-video recreates the player but no visible stutter at that point.
 * 3. No cache         → returns null (caller streams from network URL), kicks off a
 *                       background download. When download finishes cachedUri updates
 *                       to the local path. The next play from remount uses local instantly.
 *                       If the player is idle (not yet playing), this might switch it to
 *                       local mid-"loading" state — acceptable because local = faster.
 *
 * Result: after first play the video ALWAYS plays from local disk — correct duration,
 * no buffering, no network variance.
 */
export function useVideoCache(
  url: string | null | undefined,
  cacheKey?: string | null,
) {
  const [cachedUri, setCachedUri] = useState<string | null>(() => {
    if (!url) return null;
    if (isLocalUri(url)) return url;
    const memKey = getMemoryKey(url, cacheKey);
    return knownCachedFiles.get(memKey) ?? null;
  });

  // Track whether the player has started so we avoid source-switching mid-play.
  const hasStartedRef = useRef(false);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [url]);

  useEffect(() => {
    if (!url) {
      setCachedUri(null);
      return;
    }
    if (isLocalUri(url)) {
      setCachedUri(url);
      return;
    }

    const memKey = getMemoryKey(url, cacheKey);

    // Already resolved — nothing to do.
    if (knownCachedFiles.has(memKey)) {
      // Ensure state is in sync (e.g. after fast-refresh).
      setCachedUri(knownCachedFiles.get(memKey)!);
      return;
    }

    let cancelled = false;
    const filePath = getFilePath(url, cacheKey);

    async function init() {
      // Fast disk check (~20-50ms) — catches files from prior sessions.
      try {
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists) {
          knownCachedFiles.set(memKey, filePath);
          if (!cancelled) setCachedUri(filePath);
          return;
        }
      } catch {
        // Non-fatal — fall through to download.
      }

      // Deduplicate concurrent downloads for the same URL.
      let download = activeDownloads.get(memKey);
      if (!download) {
        download = (async () => {
          try {
            const result = await FileSystem.createDownloadResumable(
              url!,
              filePath,
            ).downloadAsync();
            if (result?.uri) {
              knownCachedFiles.set(memKey, filePath);
            }
          } catch {
            // Silent fail — streaming continues unaffected.
          } finally {
            activeDownloads.delete(memKey);
          }
        })();
        activeDownloads.set(memKey, download);
      }

      await download;

      // After download, update cachedUri so the next idle/load cycle uses local.
      // Only switch if we haven't started playing yet (avoids mid-playback stutter).
      if (!cancelled && knownCachedFiles.has(memKey) && !hasStartedRef.current) {
        setCachedUri(filePath);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [url, cacheKey]);

  // Call this from the player when it actually starts playing so we stop
  // switching sources mid-playback.
  const markStarted = () => { hasStartedRef.current = true; };

  return { cachedUri, markStarted };
}

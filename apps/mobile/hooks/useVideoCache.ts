import { useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { getCachedEntry, recordCachedEntry } from '@/lib/video/videoCacheStore';

// Module-level registry: memKey → local file URI.
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
 * Download (or reuse an in-flight download for) a remote URL into the disk
 * cache. Idempotent — concurrent callers share the same promise. Returns the
 * local file URI on success, null on failure (or when the URL is local).
 *
 * This is the entry point both `useVideoCache` and the predictive prefetch
 * queue call into so the LRU index, on-disk file, and in-memory shortcuts
 * all stay in sync.
 */
export async function downloadToCache(
  url: string,
  cacheKey?: string | null,
): Promise<string | null> {
  if (!url || isLocalUri(url)) return null;

  const memKey = getMemoryKey(url, cacheKey);
  const filePath = getFilePath(url, cacheKey);

  // Fast path: already known in this session.
  const knownPath = knownCachedFiles.get(memKey);
  if (knownPath) return knownPath;

  // Persisted hit from a prior session.
  const persisted = await getCachedEntry(memKey);
  if (persisted) {
    knownCachedFiles.set(memKey, persisted.filePath);
    return persisted.filePath;
  }

  // Last-resort disk check (file present but not in index — e.g. legacy).
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      knownCachedFiles.set(memKey, filePath);
      await recordCachedEntry({ memKey, url, filePath });
      return filePath;
    }
  } catch {
    // ignore — fall through to download
  }

  // Dedupe concurrent downloads (e.g. multiple players + the prefetcher).
  let download = activeDownloads.get(memKey);
  if (!download) {
    download = (async () => {
      try {
        const result = await FileSystem.createDownloadResumable(url, filePath).downloadAsync();
        if (result?.uri) {
          knownCachedFiles.set(memKey, filePath);
          await recordCachedEntry({ memKey, url, filePath });
        }
      } catch {
        // Silent fail — caller will fall back to streaming.
      } finally {
        activeDownloads.delete(memKey);
      }
    })();
    activeDownloads.set(memKey, download);
  }
  await download;
  return knownCachedFiles.get(memKey) ?? null;
}

/** Synchronous check — used by the prefetch queue to skip URLs already cached
 *  this session without paying for an async lookup. */
export function isVideoKnownCached(url: string, cacheKey?: string | null): boolean {
  if (!url || isLocalUri(url)) return false;
  return knownCachedFiles.has(getMemoryKey(url, cacheKey));
}

/** Synchronous check for an in-flight download — same purpose as above. */
export function isVideoDownloading(url: string, cacheKey?: string | null): boolean {
  if (!url || isLocalUri(url)) return false;
  return activeDownloads.has(getMemoryKey(url, cacheKey));
}

/**
 * TikTok/YouTube-style video cache hook.
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
  allowBackgroundSourceSwitch = true,
) {
  const [cachedEntry, setCachedEntry] = useState<{
    memKey: string;
    filePath: string;
  } | null>(() => {
    if (!url) return null;
    if (isLocalUri(url)) return null;
    const memKey = getMemoryKey(url, cacheKey);
    const filePath = knownCachedFiles.get(memKey);
    return filePath ? { memKey, filePath } : null;
  });
  const currentMemKey = url && !isLocalUri(url) ? getMemoryKey(url, cacheKey) : null;
  const cachedUri = isLocalUri(url ?? "")
    ? (url ?? null)
    : cachedEntry?.memKey === currentMemKey
      ? cachedEntry.filePath
      : null;

  // Track whether the player has started so we avoid source-switching mid-play.
  const hasStartedRef = useRef(false);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [url]);

  useEffect(() => {
    if (!url) {
      setCachedEntry(null);
      return;
    }
    if (isLocalUri(url)) {
      setCachedEntry(null);
      return;
    }

    const memKey = getMemoryKey(url, cacheKey);

    // Already resolved in this session — sync up and bail.
    const knownPath = knownCachedFiles.get(memKey);
    if (knownPath) {
      setCachedEntry({ memKey, filePath: knownPath });
      return;
    }

    let cancelled = false;

    (async () => {
      const local = await downloadToCache(url, cacheKey);
      if (cancelled || !local) return;
      if (!allowBackgroundSourceSwitch) return;
      if (hasStartedRef.current) return; // don't swap mid-playback
      setCachedEntry({ memKey, filePath: local });
    })();

    return () => {
      cancelled = true;
    };
  }, [url, cacheKey, allowBackgroundSourceSwitch]);

  // Call this from the player when it actually starts playing so we stop
  // switching sources mid-playback.
  const markStarted = () => {
    hasStartedRef.current = true;
  };

  return { cachedUri, markStarted };
}

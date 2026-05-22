/**
 * videoCacheStore — bounded LRU index for downloaded video files.
 *
 * Why: `useVideoCache` already downloads videos to `FileSystem.cacheDirectory`
 * and remembers their paths in a module-level map for the session. But the
 * cache was unbounded — every video the user ever opened lingered on disk
 * across sessions, eventually filling the device.
 *
 * What this adds:
 *   1. Bounded total size (DEFAULT 500 MB). When a new entry pushes the
 *      total over the cap, we evict the least-recently-accessed entries
 *      (LRU) and delete their files from disk until we're under cap again.
 *   2. Cross-session persistence: the index is mirrored to AsyncStorage on
 *      every mutation. Next app launch we hydrate from storage so old files
 *      are accounted for from the very first cache check.
 *   3. `lastAccessMs` updated on every cache hit so heavily-used videos
 *      stay resident.
 *
 * This module is intentionally framework-free — it has no React, no hooks,
 * no expo-image — just a small async API. Callers: `useVideoCache` and the
 * predictive prefetch queue.
 */
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INDEX_STORAGE_KEY = "@ph/video-cache-index/v1";
const DEFAULT_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export interface VideoCacheEntry {
  /** Stable identity (URL stripped of query string, optionally prefixed with cacheKey). */
  memKey: string;
  /** Source URL the file came from — kept so we can re-download if the file vanishes. */
  url: string;
  /** Absolute local file URI (file://...). */
  filePath: string;
  sizeBytes: number;
  lastAccessMs: number;
}

interface CacheIndexShape {
  /** memKey → entry */
  entries: Record<string, VideoCacheEntry>;
}

let hydratePromise: Promise<void> | null = null;
let indexMemory: CacheIndexShape = { entries: {} };
let maxBytes = DEFAULT_MAX_BYTES;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void AsyncStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(indexMemory)).catch(() => undefined);
  }, 300);
}

async function hydrate(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(INDEX_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CacheIndexShape;
      if (parsed && typeof parsed === "object" && parsed.entries && typeof parsed.entries === "object") {
        indexMemory = parsed;
      }
    } catch {
      // Corrupt index — start fresh; not worth crashing for.
      indexMemory = { entries: {} };
    }
  })();
  return hydratePromise;
}

/** Override the default cap (mainly for tests). */
export function setVideoCacheMaxBytes(bytes: number) {
  maxBytes = Math.max(10 * 1024 * 1024, bytes);
}

/** Look up an entry. Updates lastAccessMs on hit. Returns null if missing
 * (also returns null if the file has been deleted underneath us). */
export async function getCachedEntry(memKey: string): Promise<VideoCacheEntry | null> {
  await hydrate();
  const entry = indexMemory.entries[memKey];
  if (!entry) return null;
  // Confirm the file is still there before claiming a hit.
  try {
    const info = await FileSystem.getInfoAsync(entry.filePath);
    if (!info.exists) {
      delete indexMemory.entries[memKey];
      schedulePersist();
      return null;
    }
  } catch {
    return entry;
  }
  entry.lastAccessMs = Date.now();
  schedulePersist();
  return entry;
}

/** Record a freshly-downloaded file. Evicts oldest entries if over cap. */
export async function recordCachedEntry(input: {
  memKey: string;
  url: string;
  filePath: string;
}): Promise<void> {
  await hydrate();
  let sizeBytes = 0;
  try {
    const info = await FileSystem.getInfoAsync(input.filePath);
    if (info.exists && "size" in info && typeof info.size === "number") {
      sizeBytes = info.size;
    }
  } catch {
    // Best-effort — entry still tracked with 0 bytes if size is unavailable.
  }
  indexMemory.entries[input.memKey] = {
    memKey: input.memKey,
    url: input.url,
    filePath: input.filePath,
    sizeBytes,
    lastAccessMs: Date.now(),
  };
  schedulePersist();
  await evictIfOverCap();
}

async function evictIfOverCap(): Promise<void> {
  const entries = Object.values(indexMemory.entries);
  let totalBytes = entries.reduce((acc, e) => acc + (e.sizeBytes || 0), 0);
  if (totalBytes <= maxBytes) return;

  // Oldest-first eviction by lastAccessMs.
  const sorted = entries.sort((a, b) => a.lastAccessMs - b.lastAccessMs);
  for (const entry of sorted) {
    if (totalBytes <= maxBytes) break;
    try {
      await FileSystem.deleteAsync(entry.filePath, { idempotent: true });
    } catch {
      // ignore — file may already be gone
    }
    delete indexMemory.entries[entry.memKey];
    totalBytes -= entry.sizeBytes || 0;
  }
  schedulePersist();
}

/** Total bytes currently tracked. Useful for diagnostics + tests. */
export async function getCacheTotalBytes(): Promise<number> {
  await hydrate();
  return Object.values(indexMemory.entries).reduce((acc, e) => acc + (e.sizeBytes || 0), 0);
}

/** Wipe everything. Only used from settings/dev tools. */
export async function clearVideoCache(): Promise<void> {
  await hydrate();
  for (const entry of Object.values(indexMemory.entries)) {
    try {
      await FileSystem.deleteAsync(entry.filePath, { idempotent: true });
    } catch {
      // ignore
    }
  }
  indexMemory = { entries: {} };
  schedulePersist();
}

/**
 * useWindowedVideoMount — given the full list of video keys (e.g. exercise IDs)
 * and the currently viewable subset reported by a list, return which subset
 * should be allowed to mount a real `<VideoPlayer>`. The rest render
 * `<VideoThumb>` (poster + tap to load) so no native decoder is allocated.
 *
 * Algorithm:
 *   - Always include any key the user has tapped/expanded (`pinned` set), so
 *     the active player keeps playing when scrolled to the edge of viewport.
 *   - Otherwise pick the keys nearest the center of the current viewable
 *     range, capped at `maxConcurrent` (default 3).
 *
 * The mount set is recomputed only when the viewable range or pinned set
 * actually changes — handed back as a `Set` for O(1) lookup in render.
 */
import { useCallback, useMemo, useState } from "react";

export interface UseWindowedVideoMountInput<K extends string | number> {
  /** Ordered list of all keys in the list. */
  allKeys: K[];
  /** Indexes of currently viewable items, as reported by FlashList/FlatList.
   *  Empty array on first render is fine. */
  viewableIndexes: number[];
  /** Hard cap on simultaneously mounted real players. Default 3. */
  maxConcurrent?: number;
}

export interface WindowedVideoMountResult<K extends string | number> {
  /** Keys whose VideoPlayer is allowed to mount. */
  mounted: Set<K>;
  /** Toggle "user tapped this thumb to expand" — keeps it mounted even if
   *  it scrolls out of view. Pass the same key to un-pin. */
  pin: (key: K) => void;
  /** Force-clear all pins (e.g. when navigating away). */
  clearPins: () => void;
  /** Whether a given key is allowed to render the real player. */
  isMounted: (key: K) => boolean;
}

export function useWindowedVideoMount<K extends string | number>({
  allKeys,
  viewableIndexes,
  maxConcurrent = 3,
}: UseWindowedVideoMountInput<K>): WindowedVideoMountResult<K> {
  const [pinned, setPinned] = useState<Set<K>>(() => new Set());

  const pin = useCallback((key: K) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearPins = useCallback(() => {
    setPinned((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const mounted = useMemo<Set<K>>(() => {
    const result = new Set<K>(pinned);
    if (result.size >= maxConcurrent || allKeys.length === 0) return result;

    if (viewableIndexes.length === 0) {
      // No viewport info yet — admit the first few keys so the very top of the
      // list isn't empty until the first scroll event fires.
      for (let i = 0; i < Math.min(maxConcurrent - result.size, allKeys.length); i++) {
        const key = allKeys[i];
        if (key != null) result.add(key);
      }
      return result;
    }

    // Pick keys nearest the center of the viewable range.
    const minIdx = Math.min(...viewableIndexes);
    const maxIdx = Math.max(...viewableIndexes);
    const center = (minIdx + maxIdx) / 2;
    const ranked = allKeys
      .map((key, idx) => ({ key, distance: Math.abs(idx - center) }))
      .sort((a, b) => a.distance - b.distance);
    for (const { key } of ranked) {
      if (result.size >= maxConcurrent) break;
      result.add(key);
    }
    return result;
  }, [allKeys, viewableIndexes, pinned, maxConcurrent]);

  const isMounted = useCallback((key: K) => mounted.has(key), [mounted]);

  return { mounted, pin, clearPins, isMounted };
}

/**
 * useSessionVideoPrefetch — when an athlete opens a session screen, kick off
 * background downloads of the exercise demo videos so they play instantly
 * from cache when tapped.
 *
 * Priority is sequence-order: the first exercise gets priority 0, the
 * second 1, and so on. The bounded-concurrency queue (`videoPrefetchQueue`)
 * pulls them in that order at K=1, so we never saturate the network.
 *
 * The hook also enqueues athlete-upload + coach-response URLs because those
 * show up as thumbs in the same list and tapping any of them should feel
 * instant.
 *
 * On unmount, queued (not-yet-downloaded) URLs for THIS session are
 * cancelled so we don't keep pulling bytes for a screen the user left.
 */
import { useEffect } from "react";
import { enqueueVideoPrefetch, cancelOtherPrefetches } from "@/lib/video/videoPrefetchQueue";

interface PrefetchInput {
  url?: string | null;
  cacheKey?: string | null;
}

function getMemKey(url: string, cacheKey?: string | null): string {
  const baseUrl = url.split("?")[0];
  return cacheKey ? `${cacheKey}:${baseUrl}` : baseUrl;
}

export function useSessionVideoPrefetch(items: PrefetchInput[] | null | undefined) {
  useEffect(() => {
    if (!items || items.length === 0) return;
    const cancels: Array<() => void> = [];
    const memKeys = new Set<string>();
    items.forEach((item, idx) => {
      if (!item.url || /^https?:\/\//i.test(item.url) === false) return;
      memKeys.add(getMemKey(item.url, item.cacheKey ?? null));
      cancels.push(enqueueVideoPrefetch(item.url, { priority: idx, cacheKey: item.cacheKey ?? null }));
    });
    return () => {
      // Cancel queue items belonging to this screen. Doesn't abort in-flight.
      for (const cancel of cancels) cancel();
      // Also broadcast a "drop everything not from THIS screen" signal in case
      // multiple screens accumulated queued items.
      cancelOtherPrefetches(memKeys);
    };
  }, [items]);
}

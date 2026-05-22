/**
 * videoPrefetchQueue — bounded-concurrency priority queue for downloading
 * upcoming exercise videos in the background.
 *
 * Why: `useVideoCache` only downloads a file once a `<VideoPlayer>` actually
 * mounts. With LazyVideo (phase 4) most videos in a session screen are
 * thumbs and never mount until tapped — so they never warm the cache.
 *
 * Algorithm:
 *   - One global queue (`Item[]`) sorted by priority (low number = high
 *     priority). enqueue() inserts in priority order; duplicates per memKey
 *     are deduped and re-prioritised.
 *   - A counting semaphore (`MAX_CONCURRENT`) caps how many downloads run
 *     at once. When a worker finishes, the next item is pulled.
 *   - We reuse the same `downloadToCache` function `useVideoCache` uses, so
 *     in-flight downloads are deduped across the queue and the player hook,
 *     and the LRU cache index stays consistent.
 *
 * Cellular awareness is intentionally NOT wired here yet — that would
 * require `expo-network` (native) and a build. The current default
 * (MAX_CONCURRENT = 1) is the conservative choice picked from the user's
 * "cellular too (lighter)" preference. Bumping to 2 on Wi-Fi is a one-line
 * change after a native rebuild adds expo-network.
 */
import { downloadToCache, isVideoDownloading, isVideoKnownCached } from "@/hooks/useVideoCache";

const MAX_CONCURRENT_DEFAULT = 1;
let maxConcurrent = MAX_CONCURRENT_DEFAULT;

interface QueueItem {
  memKey: string;
  url: string;
  cacheKey: string | null;
  priority: number;
  cancelled: boolean;
}

const queue: QueueItem[] = [];
let inFlight = 0;

function getMemKey(url: string, cacheKey?: string | null): string {
  const baseUrl = url.split("?")[0];
  return cacheKey ? `${cacheKey}:${baseUrl}` : baseUrl;
}

/** Insert a URL into the prefetch queue. Lower `priority` = pulled sooner.
 *  Returns a cancellation token: call it to remove from the queue (a
 *  download already in-flight is allowed to finish — partial files would
 *  waste the bytes already pulled). */
export function enqueueVideoPrefetch(
  url: string | null | undefined,
  options?: { priority?: number; cacheKey?: string | null },
): () => void {
  if (!url) return () => undefined;
  const cacheKey = options?.cacheKey ?? null;
  const memKey = getMemKey(url, cacheKey);
  // Already cached or in flight elsewhere — nothing to do.
  if (isVideoKnownCached(url, cacheKey)) return () => undefined;
  if (isVideoDownloading(url, cacheKey)) return () => undefined;

  const priority = options?.priority ?? 100;
  const existing = queue.find((q) => q.memKey === memKey);
  if (existing) {
    // Promote if the new priority is higher (lower number).
    if (priority < existing.priority) {
      existing.priority = priority;
      queue.sort((a, b) => a.priority - b.priority);
    }
    return () => {
      existing.cancelled = true;
    };
  }
  const item: QueueItem = { memKey, url, cacheKey, priority, cancelled: false };
  queue.push(item);
  queue.sort((a, b) => a.priority - b.priority);
  void pump();
  return () => {
    item.cancelled = true;
  };
}

async function pump(): Promise<void> {
  while (inFlight < maxConcurrent) {
    const next = queue.shift();
    if (!next) return;
    if (next.cancelled) continue;
    if (isVideoKnownCached(next.url, next.cacheKey)) continue;
    if (isVideoDownloading(next.url, next.cacheKey)) continue;
    inFlight += 1;
    void (async () => {
      try {
        await downloadToCache(next.url, next.cacheKey);
      } catch {
        // download failures are silent — they just fail to warm the cache
      } finally {
        inFlight -= 1;
        // Keep draining
        void pump();
      }
    })();
  }
}

/** Drop every queued URL whose memKey is NOT in `keepMemKeys`. Lets a screen
 *  signal "I navigated away — stop prefetching the rest of my list". Doesn't
 *  abort in-flight downloads (those already paid the network cost). */
export function cancelOtherPrefetches(keepMemKeys?: Set<string>): void {
  for (const item of queue) {
    if (!keepMemKeys || !keepMemKeys.has(item.memKey)) {
      item.cancelled = true;
    }
  }
}

/** Test/dev helper — change the cap. */
export function setVideoPrefetchConcurrency(n: number) {
  maxConcurrent = Math.max(1, Math.floor(n));
  void pump();
}

/** Test/dev helper — drain the queue immediately. */
export function clearVideoPrefetchQueue() {
  while (queue.length > 0) {
    const item = queue.shift();
    if (item) item.cancelled = true;
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { apiRequest } from "../api";

/* ------------------------------------------------------------------ */
/*  Persistent mutation retry queue                                    */
/*  Queues failed POST/PUT/PATCH/DELETE requests for automatic retry   */
/*  on app foreground or explicit flush.                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "ph_mutation_retry_queue_v1";
const MAX_RETRIES = 5;

export interface QueuedMutation {
  id: string;
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  retryCount: number;
  createdAt: number;
  lastAttemptAt?: number;
}

let queue: QueuedMutation[] = [];
let processing = false;
let initialized = false;

/* ---- Persistence ---- */

async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // best-effort
  }
}

async function hydrateQueue(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as QueuedMutation[];
      if (Array.isArray(parsed)) {
        // Drop entries older than 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        queue = parsed.filter(
          (m) => m.createdAt > cutoff && m.retryCount < MAX_RETRIES,
        );
      }
    }
  } catch {
    queue = [];
  }
}

/* ---- Queue operations ---- */

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Returns true if the error looks like a network/transport failure
 * (as opposed to a 4xx business-logic error that should not be retried).
 */
export function isNetworkError(error: unknown): boolean {
  if (error == null) return false;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const m = error.message;
    return (
      m.includes("Network request failed") ||
      m.includes("Failed to fetch") ||
      m.includes("Cannot reach API") ||
      m.includes("Request timed out") ||
      m.startsWith("502 ") ||
      m.startsWith("503 ") ||
      m.startsWith("504 ")
    );
  }
  return false;
}

/**
 * Add a failed mutation to the retry queue.
 * Only call this for network-level failures, not 4xx errors.
 */
export async function enqueueMutation(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<void> {
  await hydrateQueue();
  const entry: QueuedMutation = {
    id: generateId(),
    path,
    method,
    body,
    headers,
    retryCount: 0,
    createdAt: Date.now(),
  };
  queue.push(entry);
  await persistQueue();
}

/**
 * Process all queued mutations with exponential backoff.
 * Skips processing if already running.
 */
export async function processQueue(): Promise<void> {
  if (processing) return;
  await hydrateQueue();
  if (queue.length === 0) return;

  processing = true;
  const completed: string[] = [];
  const failed: string[] = [];

  for (const entry of [...queue]) {
    // Exponential backoff: skip if too soon since last attempt
    if (entry.lastAttemptAt) {
      const backoffMs = Math.min(1000 * 2 ** entry.retryCount, 30000);
      if (Date.now() - entry.lastAttemptAt < backoffMs) continue;
    }

    try {
      await apiRequest(entry.path, {
        method: entry.method,
        body: entry.body,
        headers: entry.headers,
      });
      completed.push(entry.id);
    } catch (error) {
      entry.retryCount += 1;
      entry.lastAttemptAt = Date.now();

      if (entry.retryCount >= MAX_RETRIES || !isNetworkError(error)) {
        // Give up -- max retries exhausted or non-retriable error
        failed.push(entry.id);
        console.warn("Mutation queue: dropping entry after failure", {
          path: entry.path,
          method: entry.method,
          retryCount: entry.retryCount,
        });
      }
    }
  }

  // Remove completed and permanently-failed entries
  const toRemove = new Set([...completed, ...failed]);
  queue = queue.filter((m) => !toRemove.has(m.id));
  await persistQueue();
  processing = false;
}

/** Returns current queue length (for diagnostics). */
export function getQueueLength(): number {
  return queue.length;
}

/** Clears the entire queue (for logout / debug). */
export async function clearMutationQueue(): Promise<void> {
  queue = [];
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/* ---- Auto-process triggers ---- */

let listenersAttached = false;

/**
 * Call once at app startup (e.g. in queryClient.ts or app layout).
 * Listens for app foreground events to automatically flush the
 * retry queue when the user returns to the app.
 */
export function initMutationQueue(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  // Hydrate on init and process any pending entries
  hydrateQueue().then(() => processQueue()).catch(() => {});

  // Retry when app returns to foreground
  AppState.addEventListener("change", (status) => {
    if (status === "active") {
      processQueue().catch(() => {});
    }
  });
}

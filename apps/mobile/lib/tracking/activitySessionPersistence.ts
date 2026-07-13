import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACTIVITY_SESSION_STORAGE_KEY,
  type ActivitySession,
  lifecycleAfterRestore,
} from "./activitySession";

function isSession(value: unknown): value is ActivitySession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<ActivitySession>;
  return session.version === 1 && typeof session.id === "string" && typeof session.startedAt === "number" &&
    Array.isArray(session.coordinates) && typeof session.sport === "string";
}

export async function loadActivitySession(): Promise<ActivitySession | null> {
  const raw = await AsyncStorage.getItem(ACTIVITY_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) {
      await AsyncStorage.removeItem(ACTIVITY_SESSION_STORAGE_KEY);
      return null;
    }
    return { ...parsed, lifecycle: lifecycleAfterRestore(parsed), updatedAt: Date.now() };
  } catch {
    await AsyncStorage.removeItem(ACTIVITY_SESSION_STORAGE_KEY);
    return null;
  }
}

let queuedSession: ActivitySession | null = null;
let queuedClear = false;
let flushPromise: Promise<void> | null = null;

/**
 * Coalesces frequent GPS checkpoints and serializes them with clears. This is
 * important because AsyncStorage writes are asynchronous: an older write must
 * never complete after a later discard and resurrect an activity.
 */
function scheduleFlush(): Promise<void> {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    while (queuedClear || queuedSession) {
      const shouldClear = queuedClear;
      const session = queuedSession;
      queuedClear = false;
      queuedSession = null;
      if (shouldClear) {
        await AsyncStorage.removeItem(ACTIVITY_SESSION_STORAGE_KEY);
      } else if (session) {
        await AsyncStorage.setItem(ACTIVITY_SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    }
  })().finally(() => {
    flushPromise = null;
    if (queuedClear || queuedSession) void scheduleFlush();
  });
  return flushPromise;
}

export function saveActivitySession(session: ActivitySession): Promise<void> {
  queuedSession = session;
  queuedClear = false;
  return scheduleFlush();
}

export function clearActivitySession(): Promise<void> {
  queuedSession = null;
  queuedClear = true;
  return scheduleFlush();
}

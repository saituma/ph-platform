import { apiRequest } from "@/lib/api";
import { store } from "@/store";
import {
  adoptOrphanRuns,
  clearRunDeletion,
  getPendingRunDeletions,
  getUnsyncedRuns,
  markRunsSynced,
  upsertRunFromServer,
  initSQLiteRuns,
  EFFORT_PENDING_FEEDBACK,
} from "./sqliteRuns";
import AsyncStorage from "@react-native-async-storage/async-storage";

const lastPullKey = (userId: string | null) => `run_sync_last_pull${userId ? `_${userId}` : ""}`;

type ServerRun = {
  id: number;
  clientId: string;
  date: string;
  distanceMeters: number;
  durationSeconds: number;
  avgPace: number | null;
  avgSpeed: number | null;
  calories: number | null;
  coordinates: unknown | null;
  effortLevel: number | null;
  feelTags: unknown | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sport: string | null;
  activityLifecycle?: "saved" | "discarded" | "finishing" | null;
  visibility?: "public" | "private";
};

/** apiRequest throws `Error("<status> <message>")`, so the status is the leading token. */
function isStatus(err: unknown, status: number): boolean {
  return err instanceof Error && err.message.startsWith(`${status} `);
}

/**
 * Propagate discarded runs to the server.
 *
 * The summary screen pushes a run as soon as it opens, so a run the athlete then
 * discards can already be visible to their coach. Deleting the local row alone would
 * leave it there permanently, so discards are recorded as tombstones and drained here.
 * A tombstone is only cleared once the server confirms the run is gone (200) or was
 * never there (404) — anything else keeps it queued for the next sync trigger.
 */
export async function pushRunDeletionsToCloud(): Promise<void> {
  const token = store.getState().user.token;
  if (!token) return;
  const userId = store.getState().user.profile.id ?? null;

  initSQLiteRuns();
  const pending = getPendingRunDeletions(userId ? String(userId) : null);

  for (const clientId of pending) {
    try {
      await apiRequest(`/runs/${encodeURIComponent(clientId)}`, {
        method: "DELETE",
        token,
        suppressLog: true,
        suppressStatusCodes: [404],
      });
      clearRunDeletion(clientId);
    } catch (err) {
      // 404 = the run never reached the server (or is already gone). Either way it is
      // not visible to the coach, so the discard is satisfied.
      if (isStatus(err, 404)) {
        clearRunDeletion(clientId);
        continue;
      }
      // Offline / server error — keep the tombstone and retry on the next trigger.
      if (__DEV__) console.warn("[runSync] delete failed, will retry:", clientId, err);
    }
  }
}

/**
 * Push unsynced local runs to the server.
 * Fire-and-forget safe — never throws.
 */
export async function pushRunsToCloud(): Promise<void> {
  try {
    const token = store.getState().user.token;
    if (!token) return;
    const userId = store.getState().user.profile.id ?? null;

    initSQLiteRuns();
    // Drain discards first so a run the athlete deleted can never be resurrected by a
    // push that races it.
    await pushRunDeletionsToCloud();

    if (userId) adoptOrphanRuns(userId);
    const unsynced = getUnsyncedRuns(userId);
    if (!unsynced.length) return;

    // Batch into chunks of 50 (API limit)
    const chunks = [];
    for (let i = 0; i < unsynced.length; i += 50) {
      chunks.push(unsynced.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      const payload = chunk.map((r) => ({
        clientId: r.id,
        date: r.date,
        distanceMeters: r.distance_meters,
        durationSeconds: r.duration_seconds,
        avgPace: r.avg_pace || null,
        avgSpeed: r.avg_speed || null,
        calories: r.calories || null,
        coordinates: safeJsonParse(r.coordinates),
        effortLevel:
          r.effort_level != null && r.effort_level !== EFFORT_PENDING_FEEDBACK && r.effort_level >= 0
            ? r.effort_level
            : null,
        feelTags: safeJsonParse(r.feel_tags),
        notes: r.notes || null,
        sport: r.sport || null,
        activityLifecycle: r.lifecycle === "finishing" ? "finishing" : "saved",
        visibility: r.privacy === "team" ? "public" : "private",
      }));

      const result = await apiRequest<{ synced: string[] }>("/runs/sync", {
        method: "POST",
        token,
        body: { runs: payload },
        suppressLog: true,
      });

      if (result.synced?.length) {
        markRunsSynced(result.synced);
      }
    }
  } catch (err) {
    // Silently fail — sync will retry on next trigger
    if (__DEV__) {
      console.warn("[runSync] push failed:", err);
    }
  }
}

let queuedPush: Promise<void> | null = null;
let pushRequestedWhileRunning = false;

/**
 * Coalesces save-triggered sync calls so screens can request immediate admin
 * visibility without starting overlapping /runs/sync requests.
 *
 * A request that arrives mid-flight schedules a trailing push rather than being
 * dropped: the summary screen pushes once on mount and again on save, and the
 * save (which carries the questionnaire answers) must never be the one discarded.
 */
export function queueRunPushToCloud(): void {
  if (queuedPush) {
    pushRequestedWhileRunning = true;
    return;
  }
  queuedPush = pushRunsToCloud().finally(() => {
    queuedPush = null;
    if (pushRequestedWhileRunning) {
      pushRequestedWhileRunning = false;
      queueRunPushToCloud();
    }
  });
}

/**
 * Pull runs from the server that are newer than the last pull.
 * Fire-and-forget safe — never throws.
 */
export async function pullRunsFromCloud(): Promise<void> {
  try {
    const token = store.getState().user.token;
    if (!token) return;
    const userId = store.getState().user.profile.id ? String(store.getState().user.profile.id) : null;

    initSQLiteRuns();
    const lastPull = await AsyncStorage.getItem(lastPullKey(userId));
    const query = lastPull ? `?after=${encodeURIComponent(lastPull)}` : "";

    const result = await apiRequest<{ runs: ServerRun[] }>(`/runs${query}`, {
      token,
      suppressLog: true,
      skipCache: true,
      forceRefresh: true,
    });

    if (result.runs?.length) {
      for (const run of result.runs) {
        upsertRunFromServer({
          id: run.clientId,
          date: run.date,
          distance_meters: run.distanceMeters,
          duration_seconds: run.durationSeconds,
          avg_pace: run.avgPace,
          avg_speed: run.avgSpeed,
          calories: run.calories,
          coordinates: run.coordinates ? JSON.stringify(run.coordinates) : null,
          effort_level: run.effortLevel,
          feel_tags: run.feelTags ? JSON.stringify(run.feelTags) : null,
          notes: run.notes,
          sport: run.sport,
          user_id: userId,
        });
      }
    }

    await AsyncStorage.setItem(lastPullKey(userId), new Date().toISOString());
  } catch (err) {
    // Silently fail — sync will retry on next trigger
    if (__DEV__) {
      console.warn("[runSync] pull failed:", err);
    }
  }
}

/**
 * Full bidirectional sync: push first, then pull.
 */
export async function syncRuns(): Promise<void> {
  await pushRunsToCloud();
  await pullRunsFromCloud();
}

/**
 * Sync a single just-completed run with explicit visibility.
 * Used when the team share sheet resolves before navigating away from active-run.
 * Marks the run synced in SQLite so the background queue skips it.
 */
export async function syncRunWithVisibility(
  run: {
    clientId: string;
    date: string;
    distanceMeters: number;
    durationSeconds: number;
    avgPace: number | null;
    avgSpeed: number | null;
    calories: number | null;
    coordinates: unknown;
    effortLevel: number | null;
    feelTags: unknown;
    notes: string | null;
    sport: string | null;
  },
  visibility: "public" | "private",
  token: string,
): Promise<void> {
  try {
    const result = await apiRequest<{ synced: string[] }>("/runs/sync", {
      method: "POST",
      token,
      body: {
        runs: [
          {
            clientId: run.clientId,
            date: run.date,
            distanceMeters: run.distanceMeters,
            durationSeconds: run.durationSeconds,
            avgPace: run.avgPace,
            avgSpeed: run.avgSpeed,
            calories: run.calories,
            coordinates: run.coordinates,
            effortLevel: run.effortLevel,
            feelTags: run.feelTags,
            notes: run.notes,
            sport: run.sport,
            visibility,
          },
        ],
      },
    });
    if (result.synced?.includes(run.clientId)) {
      markRunsSynced([run.clientId]);
    }
  } catch (err) {
    if (__DEV__) console.warn("[runSync] syncRunWithVisibility failed:", err);
  }
}

function safeJsonParse(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

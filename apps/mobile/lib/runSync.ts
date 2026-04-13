import { apiRequest } from "@/lib/api";
import { store } from "@/store";
import {
  getUnsyncedRuns,
  markRunsSynced,
  upsertRunFromServer,
  initSQLiteRuns,
  EFFORT_PENDING_FEEDBACK,
} from "./sqliteRuns";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_PULL_KEY = "run_sync_last_pull";

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
};

/**
 * Push unsynced local runs to the server.
 * Fire-and-forget safe — never throws.
 */
export async function pushRunsToCloud(): Promise<void> {
  try {
    const token = store.getState().user.token;
    if (!token) return;

    initSQLiteRuns();
    const unsynced = getUnsyncedRuns().filter(
      (r) => r.effort_level !== EFFORT_PENDING_FEEDBACK,
    );
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
          r.effort_level != null && r.effort_level >= 0 ? r.effort_level : null,
        feelTags: safeJsonParse(r.feel_tags),
        notes: r.notes || null,
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

/**
 * Pull runs from the server that are newer than the last pull.
 * Fire-and-forget safe — never throws.
 */
export async function pullRunsFromCloud(): Promise<void> {
  try {
    const token = store.getState().user.token;
    if (!token) return;

    initSQLiteRuns();
    const lastPull = await AsyncStorage.getItem(LAST_PULL_KEY);
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
        });
      }
    }

    await AsyncStorage.setItem(LAST_PULL_KEY, new Date().toISOString());
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

function safeJsonParse(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

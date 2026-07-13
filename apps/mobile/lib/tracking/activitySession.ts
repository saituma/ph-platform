import type { Coordinate } from "@/store/useRunStore";

/** Durable, app-owned state for an in-progress tracked activity. */
export type ActivityLifecycleState =
  | "ready"
  | "recording"
  | "paused"
  | "recovery"
  | "finishing"
  | "saved"
  | "discarded";

export type ActivityPrivacy = "private" | "team";
export type ActivitySyncStatus = "pending" | "syncing" | "synced" | "failed";
export type ActivityRecoveryAction = "resume" | "save" | "discard";

export interface ActivitySession {
  version: 1;
  id: string;
  lifecycle: ActivityLifecycleState;
  sport: string;
  startedAt: number;
  pausedAt: number | null;
  totalPausedMs: number;
  distanceMeters: number;
  elapsedSeconds: number;
  coordinates: Coordinate[];
  privacy: ActivityPrivacy;
  shareCurrentLocation: boolean;
  shareRouteTrail: boolean;
  syncStatus: ActivitySyncStatus;
  updatedAt: number;
}

export const ACTIVITY_SESSION_STORAGE_KEY = "tracking.activity-session.v1";

export function elapsedForSession(session: Pick<ActivitySession, "startedAt" | "pausedAt" | "totalPausedMs">, now = Date.now()) {
  const end = session.pausedAt ?? now;
  return Math.max(0, Math.floor((end - session.startedAt - session.totalPausedMs) / 1000));
}

export function isRecoverableLifecycle(lifecycle: ActivityLifecycleState) {
  return lifecycle === "recording" || lifecycle === "paused" || lifecycle === "recovery" || lifecycle === "finishing";
}

/** A process restart never silently resumes collection: it must be acknowledged. */
export function lifecycleAfterRestore(session: ActivitySession): ActivityLifecycleState {
  return isRecoverableLifecycle(session.lifecycle) ? "recovery" : session.lifecycle;
}

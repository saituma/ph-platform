import { apiRequest } from "@/lib/api";
import { ProgramSectionContent, TrainingContentV2Workspace } from "@/types/programs";

export async function fetchTeamWorkspace(token: string, age: number | null, forceRefresh = false) {
  const ageQ = age != null ? `?age=${age}` : "";
  return apiRequest<TrainingContentV2Workspace>(
    `/training-content-v2/mobile${ageQ}`,
    { token, forceRefresh }
  );
}

export async function fetchPhpPlusTabs() {
  return apiRequest<{ tabs?: string[] }>(
    `/onboarding/php-plus-tabs?ts=${Date.now()}`,
    { method: "GET", suppressLog: true }
  );
}

export async function fetchSectionContent(token: string, type: string, tier: string, age: number | null, forceRefresh = false) {
  const ageQ = age !== null ? `&age=${age}` : "";
  return apiRequest<{ items: ProgramSectionContent[] }>(
    `/program-section-content?sectionType=${encodeURIComponent(String(type))}&programTier=${encodeURIComponent(tier)}${ageQ}`,
    { token, forceRefresh }
  );
}

export type FinishTrainingSessionWorkoutLog = {
  weightsUsed?: string;
  repsCompleted?: string;
  rpe?: number;
};

export type TrackingWorkout = {
  sessionId: number;
  moduleId: number;
  moduleTitle: string;
  moduleOrder: number;
  title: string;
  dayLength: number;
  order: number;
  completed: boolean;
  locked: boolean;
  lockedReason: "tier" | "sequence" | null;
  unlockTiers: Array<{ tier: string; label: string }>;
  summary: string;
  tags: string[];
  itemCount: number;
  blockCounts: {
    warmup: number;
    main: number;
    cooldown: number;
  };
  workoutLog: {
    weightsUsed: string | null;
    repsCompleted: string | null;
    rpe: number | null;
    updatedAt: string;
  } | null;
};

export type TrackingWorkoutFeed = {
  generatedAt: string;
  nextWorkoutSessionId: number | null;
  completedCount: number;
  totalCount: number;
  workouts: TrackingWorkout[];
};

export async function fetchTrackingWorkouts(
  token: string,
  age: number | null,
  forceRefresh = false,
) {
  const ageQ = age != null ? `?age=${age}` : "";
  return apiRequest<TrackingWorkoutFeed>(
    `/training-content-v2/mobile/workouts${ageQ}`,
    { token, forceRefresh },
  );
}

export async function completeTrackingWorkout(token: string, sessionId: number) {
  return apiRequest<{ item: any }>(
    `/training-content-v2/mobile/workouts/${encodeURIComponent(String(sessionId))}/complete`,
    { token, method: "POST" },
  );
}

export async function finishTrainingContentV2Session(
  token: string,
  sessionId: number,
  workoutLog?: FinishTrainingSessionWorkoutLog | null,
) {
  const body = workoutLog && Object.keys(workoutLog).length ? workoutLog : undefined;
  return apiRequest<{ item: any }>(
    `/training-content-v2/mobile/sessions/${encodeURIComponent(String(sessionId))}/finish`,
    { token, method: "POST", ...(body ? { body } : {}) },
  );
}

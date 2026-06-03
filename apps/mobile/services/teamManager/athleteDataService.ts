import { apiRequest } from "@/lib/api";

export type HistoryRange = "7d" | "30d" | "all";

export type ManagerRun = {
  id: number;
  date: string;
  distanceMeters: number;
  durationSeconds: number;
  avgPace: number | null;
  avgSpeed: number | null;
  calories: number | null;
  sport: string | null;
  notes: string | null;
};

export type ManagerProgressEntry = {
  id: number;
  type: string;
  entryDate: string;
  exerciseName: string | null;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
  measureKind: string | null;
  label: string | null;
  valueCm: number | null;
  notes: string | null;
};

export type ManagerAttendance = {
  id: number;
  status: string;
  checkInAt: string | null;
  sessionId: number;
  sessionName: string;
  startsAt: string;
  endsAt: string;
  sessionStatus: string;
  location: string | null;
};

export type ManagerTraining = {
  programs: Array<{
    programId: number;
    name: string;
    status: string;
    scheduledDate: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  sessionCompletions: Array<{ sessionId: number; title: string | null; completedAt: string }>;
  workoutLogs: Array<{
    sessionId: number;
    title: string | null;
    weightsUsed: string | null;
    repsCompleted: string | null;
    rpe: number | null;
    updatedAt: string;
  }>;
  totals: {
    programsAssigned: number;
    programsCompleted: number;
    sessionsCompleted: number;
    workoutsLogged: number;
  };
};

export type ManagerAchievements = {
  stats: { exerciseCompletions: number; sessionRuns: number; trainingDays: number };
  achievements: Array<{
    key: string;
    title: string;
    description: string;
    unlocked: boolean;
    unlockedAt: string | null;
  }>;
};

export type ManagerInjury = {
  id: number;
  description: string;
  bodyPart: string | null;
  severity: string;
  occurredAt: string;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
};

function base(athleteId: number, suffix: string, range?: HistoryRange) {
  const q = range ? `?range=${range}` : "";
  return `/team/roster/athletes/${athleteId}/${suffix}${q}`;
}

export function fetchAthleteRuns(token: string, athleteId: number, range: HistoryRange, force = false) {
  return apiRequest<{ runs: ManagerRun[] }>(base(athleteId, "runs", range), { token, forceRefresh: force, skipCache: force });
}

export function fetchAthleteProgress(token: string, athleteId: number, range: HistoryRange, force = false) {
  return apiRequest<{ entries: ManagerProgressEntry[] }>(base(athleteId, "progress", range), {
    token,
    forceRefresh: force,
    skipCache: force,
  });
}

export function fetchAthleteAttendance(token: string, athleteId: number, range: HistoryRange, force = false) {
  return apiRequest<{ attendance: ManagerAttendance[] }>(base(athleteId, "attendance", range), {
    token,
    forceRefresh: force,
    skipCache: force,
  });
}

export function fetchAthleteTraining(token: string, athleteId: number, range: HistoryRange, force = false) {
  return apiRequest<ManagerTraining>(base(athleteId, "training", range), { token, forceRefresh: force, skipCache: force });
}

export function fetchAthleteAchievements(token: string, athleteId: number, force = false) {
  return apiRequest<ManagerAchievements>(base(athleteId, "achievements"), { token, forceRefresh: force, skipCache: force });
}

export function fetchAthleteInjuries(token: string, athleteId: number, range: HistoryRange, force = false) {
  return apiRequest<{ injuries: ManagerInjury[] }>(base(athleteId, "injuries", range), {
    token,
    forceRefresh: force,
    skipCache: force,
  });
}

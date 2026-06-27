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

export type ManagerWellbeing = {
  id: number;
  dateKey: string;
  mood: number;
  energy: number;
  pain: number;
  notes: string | null;
  coachFeedback: string | null;
};

export type ManagerBooking = {
  id: number;
  type: string | null;
  status: string | null;
  startsAt: string;
  endTime: string | null;
  location: string | null;
  notes: string | null;
};

export type ManagerNutritionCompliance = {
  targetCalories: number | null;
  daysLogged: number;
  daysInRange: number | null;
  compliancePct: number | null;
  loggedDates: string[];
};

export type ManagerEngagement = {
  rangeDays: number | null;
  lastActiveAt: string | null;
  counts: {
    runs: number;
    sleepLogs: number;
    wellbeingLogs: number;
    nutritionDays: number;
    progressEntries: number;
    sessionsCompleted: number;
  };
  attendance: { present: number; total: number; pct: number | null };
};

function base(athleteId: number, suffix: string, range?: HistoryRange) {
  const q = range ? `?range=${range}` : "";
  return `/team/roster/athletes/${athleteId}/${suffix}${q}`;
}

export function fetchAthleteRuns(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<{ runs: ManagerRun[] }>(base(athleteId, "runs", range), { token });
}

export function fetchAthleteProgress(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<{ entries: ManagerProgressEntry[] }>(base(athleteId, "progress", range), {
    token,
  });
}

export function fetchAthleteAttendance(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<{ attendance: ManagerAttendance[] }>(base(athleteId, "attendance", range), {
    token,
  });
}

export function fetchAthleteTraining(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<ManagerTraining>(base(athleteId, "training", range), { token });
}

export function fetchAthleteAchievements(token: string, athleteId: number) {
  return apiRequest<ManagerAchievements>(base(athleteId, "achievements"), { token });
}

export function fetchAthleteInjuries(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<{ injuries: ManagerInjury[] }>(base(athleteId, "injuries", range), {
    token,
  });
}

export function fetchAthleteWellbeing(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<{ logs: ManagerWellbeing[] }>(base(athleteId, "wellbeing", range), {
    token,
  });
}

export function fetchAthleteBookings(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<{ bookings: ManagerBooking[] }>(base(athleteId, "bookings", range), {
    token,
  });
}

export function fetchAthleteNutritionCompliance(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<ManagerNutritionCompliance>(base(athleteId, "nutrition", range), {
    token,
  });
}

export function fetchAthleteEngagement(token: string, athleteId: number, range: HistoryRange) {
  return apiRequest<ManagerEngagement>(base(athleteId, "engagement", range), {
    token,
  });
}

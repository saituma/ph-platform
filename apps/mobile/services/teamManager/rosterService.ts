import { apiRequest } from "@/lib/api";

export type RosterAthlete = {
  id: number;
  userId: number;
  name: string;
  athleteType: string;
  age?: number;
  profilePicture?: string | null;
};

export type AthleteDetail = RosterAthlete & {
  trainingFrequency?: number;
  performanceGoals?: string;
  equipment?: string;
  growthNotes?: string;
};

export type AthleteUpdateData = Partial<
  Pick<AthleteDetail, "trainingFrequency" | "performanceGoals" | "equipment" | "growthNotes">
>;

export type RosterTeam = {
  id?: number;
  name?: string;
  maxAthletes?: number;
  emailSlug?: string;
  memberCount?: number;
  slotsRemaining?: number;
};

export type RosterResponse = {
  team?: RosterTeam;
  members?: Array<{
    athleteId: number;
    userId?: number;
    name: string | null;
    age: number | null;
    athleteType?: "youth" | "adult" | null;
    profilePicture?: string | null;
    email?: string | null;
  }>;
};

export type AthleteDetailResponse = {
  athlete?: {
    id?: number;
    userId?: number;
    name?: string | null;
    age?: number | null;
    athleteType?: string | null;
    profilePicture?: string | null;
    trainingFrequency?: number | null;
    performanceGoals?: string | null;
    equipment?: string | null;
    growthNotes?: string | null;
  };
  // Some API shapes return the athlete directly at the root
  id?: number;
  userId?: number;
  name?: string | null;
  age?: number | null;
  athleteType?: string | null;
  profilePicture?: string | null;
  trainingFrequency?: number | null;
  performanceGoals?: string | null;
  equipment?: string | null;
  growthNotes?: string | null;
};

export async function fetchRoster(token: string, forceRefresh = false): Promise<RosterResponse> {
  return apiRequest<RosterResponse>("/team/roster", {
    token,
    suppressStatusCodes: [403],
    skipCache: forceRefresh,
    forceRefresh,
  });
}

export async function fetchAthleteDetail(
  token: string,
  athleteId: number,
  forceRefresh = false,
): Promise<AthleteDetailResponse> {
  return apiRequest<AthleteDetailResponse>(`/team/roster/athletes/${athleteId}`, {
    token,
    skipCache: forceRefresh,
    forceRefresh,
  });
}

export async function updateAthlete(
  token: string,
  athleteId: number,
  data: AthleteUpdateData,
): Promise<unknown> {
  return apiRequest(`/team/roster/athletes/${athleteId}`, {
    method: "PATCH",
    token,
    body: data,
  });
}

export async function resetAthletePassword(token: string, athleteId: number): Promise<unknown> {
  return apiRequest(`/team/roster/athletes/${athleteId}/reset-password`, {
    method: "POST",
    token,
  });
}

/** Normalise an API athlete detail response into a flat AthleteDetail object */
export function normalizeAthleteDetail(raw: AthleteDetailResponse): AthleteDetail {
  const src = raw.athlete ?? raw;
  return {
    id: src.id ?? 0,
    userId: src.userId ?? 0,
    name: src.name ?? "",
    athleteType: src.athleteType ?? "adult",
    age: src.age ?? undefined,
    profilePicture: src.profilePicture ?? null,
    trainingFrequency: src.trainingFrequency ?? undefined,
    performanceGoals: src.performanceGoals ?? undefined,
    equipment: src.equipment ?? undefined,
    growthNotes: src.growthNotes ?? undefined,
  };
}

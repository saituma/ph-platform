import { apiSlice } from "../core";

export type ClientDataSectionKey =
  | "runs"
  | "nutrition"
  | "foodDiary"
  | "training"
  | "moduleCompletions"
  | "videos"
  | "sleep"
  | "wellbeing"
  | "bookings"
  | "attendance"
  | "achievements"
  | "plans"
  | "physio"
  | "legal";

export type ClientDataPageInfo = {
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type ClientDataRecord = Record<string, unknown> & { id?: number | string | null };

export type ClientDataPage<T = ClientDataRecord> = {
  items: T[];
  pageInfo: ClientDataPageInfo;
};

export type ClientDataAthleteRow = {
  athleteId: number;
  athleteUserId: number;
  name: string;
  email?: string | null;
  athleteType: "youth" | "adult" | string;
  team?: string | null;
  age?: number | null;
  profilePicture?: string | null;
  programTier?: string | null;
  status: "active" | "blocked" | "onboarding" | string;
  lastActivityAt?: string | null;
  runsCount?: number;
  nutritionCount?: number;
  trainingCount?: number;
  videoCount?: number;
};

export type ClientDataAthlete = ClientDataAthleteRow & {
  userName?: string | null;
  isBlocked?: boolean | null;
  accountCreatedAt?: string | null;
  accountUpdatedAt?: string | null;
  birthDate?: string | null;
  teamId?: number | null;
  trainingPerWeek?: number | null;
  preferredTrainingDays?: string[] | null;
  phoneNumber?: string | null;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  extraResponses?: Record<string, unknown> | null;
  currentProgramTier?: string | null;
  currentPlanId?: number | null;
  planPaymentType?: string | null;
  planCommitmentMonths?: number | null;
  planExpiresAt?: string | null;
  isSponsored?: boolean | null;
  youthTrackingEnabled?: boolean | null;
  onboardingCompleted?: boolean | null;
  onboardingCompletedAt?: string | null;
  guardianId?: number | null;
  guardianUserId?: number | null;
  guardianEmail?: string | null;
  guardianPhoneNumber?: string | null;
  guardianRelationToAthlete?: string | null;
};

export type ClientDataProgramProgress = {
  programId: number;
  programName: string;
  totalSessions: number;
  completedSessions: number;
  percentComplete: number;
};

export type ClientDataDetail = {
  athlete: ClientDataAthlete;
  profile: {
    nutritionTargets?: Record<string, unknown> | null;
    nutritionOnboarding?: Record<string, unknown> | null;
    streak?: Record<string, unknown> | null;
    programProgress?: ClientDataProgramProgress[];
    counts: Record<string, number>;
  };
  sections: Record<ClientDataSectionKey, ClientDataPage>;
};

const clientDataApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getClientDataAthletes: builder.query<
      ClientDataPage<ClientDataAthleteRow>,
      { q?: string; type?: "all" | "youth" | "adult" | "team"; cursor?: string; limit?: number } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.q) query.set("q", params.q);
        if (params?.type && params.type !== "all") query.set("type", params.type);
        if (params?.cursor) query.set("cursor", params.cursor);
        if (params?.limit) query.set("limit", String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return `/admin/client-data/athletes${suffix}`;
      },
      providesTags: ["Users"],
    }),
    getClientDataAthleteDetail: builder.query<
      ClientDataDetail,
      { athleteId: number; limit?: number }
    >({
      query: ({ athleteId, limit }) => {
        const query = new URLSearchParams();
        if (limit) query.set("limit", String(limit));
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return `/admin/client-data/athletes/${athleteId}${suffix}`;
      },
      providesTags: ["Users"],
    }),
    getClientDataAthleteSection: builder.query<
      ClientDataPage,
      { athleteId: number; section: ClientDataSectionKey; cursor?: string | null; limit?: number; from?: string; to?: string }
    >({
      query: ({ athleteId, section, cursor, limit, from, to }) => {
        const query = new URLSearchParams();
        if (cursor) query.set("cursor", cursor);
        if (limit) query.set("limit", String(limit));
        if (from) query.set("from", from);
        if (to) query.set("to", to);
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return `/admin/client-data/athletes/${athleteId}/sections/${section}${suffix}`;
      },
      providesTags: ["Users"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetClientDataAthletesQuery,
  useGetClientDataAthleteDetailQuery,
  useLazyGetClientDataAthleteSectionQuery,
} = clientDataApi;

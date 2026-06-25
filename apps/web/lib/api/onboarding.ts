import { apiSlice } from "../core";

export type AdminOnboardingAthleteType = "all" | "youth" | "adult" | "team";

export type AdminOnboardingSections = {
  basic: boolean;
  training: boolean;
  health: boolean;
  agreements: boolean;
  billing: boolean;
};

export type AdminOnboardingListItem = {
  athleteId: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  athleteName: string;
  athleteType: "youth" | "adult" | string;
  category: "youth" | "adult" | "team" | string;
  age: number | null;
  birthDate: string | null;
  teamId: number | null;
  teamName: string | null;
  guardianId: number | null;
  guardianName: string | null;
  guardianEmail: string | null;
  currentProgramTier: string | null;
  currentPlanId: number | null;
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  sections: AdminOnboardingSections;
};

export type AdminOnboardingListResponse = {
  items: AdminOnboardingListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminOnboardingDetail = {
  account: {
    userId: number;
    name: string | null;
    email: string | null;
    role: string | null;
    profilePicture: string | null;
    isBlocked: boolean | null;
  };
  athlete: {
    id: number;
    userId: number;
    name: string;
    athleteType: "youth" | "adult" | string;
    category: "youth" | "adult" | "team" | string;
    age: number | null;
    birthDate: string | null;
    teamId: number | null;
    team: string | null;
    trainingPerWeek: number | null;
    preferredTrainingDays: string[] | null;
    phoneNumber: string | null;
    injuries: unknown;
    growthNotes: string | null;
    performanceGoals: string | null;
    equipmentAccess: string | null;
    profilePicture: string | null;
    currentProgramTier: string | null;
    currentPlanId: number | null;
    planPaymentType: string | null;
    planCommitmentMonths: number | null;
    planExpiresAt: string | null;
    isSponsored: boolean | null;
    youthTrackingEnabled: boolean | null;
    onboardingCompleted: boolean;
    onboardingCompletedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  guardian: {
    id: number;
    userId: number;
    email: string | null;
    phoneNumber: string | null;
    relationToAthlete: string | null;
    activeAthleteId: number | null;
    currentProgramTier: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    userName: string | null;
    userEmail: string | null;
  } | null;
  team: {
    id: number;
    name: string | null;
    athleteType: string | null;
    minAge: number | null;
    maxAge: number | null;
    maxAthletes: number | null;
    planId: number | null;
  } | null;
  healthForm: unknown;
  legalAcceptance: Record<string, unknown> | null;
  plan: {
    id: number;
    name: string;
    tier: string | null;
    displayPrice: string | null;
    billingInterval: string | null;
    isActive: boolean | null;
  } | null;
  extraResponses: Record<string, unknown> | null;
  sections: AdminOnboardingSections;
};

const onboardingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getIncompleteOnboardingAthletes: builder.query<
      AdminOnboardingListResponse,
      {
        q?: string;
        athleteType?: AdminOnboardingAthleteType;
        teamId?: number;
        limit?: number;
        offset?: number;
      } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.q) query.set("q", params.q);
        if (params?.athleteType && params.athleteType !== "all") {
          query.set("athleteType", params.athleteType);
        }
        if (params?.teamId) query.set("teamId", String(params.teamId));
        if (params?.limit) query.set("limit", String(params.limit));
        if (params?.offset) query.set("offset", String(params.offset));
        const suffix = query.toString();
        return suffix ? `/admin/onboarding/incomplete?${suffix}` : "/admin/onboarding/incomplete";
      },
      providesTags: ["OnboardingReview"],
    }),
    getOnboardingAthleteDetail: builder.query<AdminOnboardingDetail, number>({
      query: (athleteId) => `/admin/onboarding/athletes/${athleteId}`,
      providesTags: (_result, _error, athleteId) => [
        { type: "OnboardingReview" as const, id: athleteId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetIncompleteOnboardingAthletesQuery,
  useGetOnboardingAthleteDetailQuery,
} = onboardingApi;

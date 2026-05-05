import { apiSlice } from "../core";
import type { UserListRow, UserOnboardingResponse } from "../core";

const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<
      { users: UserListRow[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/admin/users";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString ? `/admin/users?${queryString}` : "/admin/users";
      },
      providesTags: ["Users"],
    }),
    getAdminTeams: builder.query<
      {
        teams: Array<{
          id: number;
          team: string;
          memberCount: number;
          youthCount: number;
          adultCount: number;
          guardianCount?: number;
          createdAt: string;
          updatedAt: string;
        }>;
      },
      void
    >({
      query: () => "/admin/teams",
      providesTags: ["Users"],
    }),
    blockUser: builder.mutation<any, { userId: number; blocked: boolean }>({
      query: ({ userId, blocked }) => ({
        url: `/admin/users/${userId}/block`,
        method: "POST",
        body: { blocked },
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<any, { userId: number }>({
      query: ({ userId }) => ({
        url: `/admin/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    provisionGuardian: builder.mutation<
      {
        userId: number;
        athleteId: number;
        athleteUserId: number;
        status: string;
        emailSent: boolean;
      },
      {
        email: string;
        guardianDisplayName: string;
        athleteName: string;
        birthDate: string;
        team?: string | null;
        trainingPerWeek: number;
        injuries?: unknown;
        growthNotes?: string | null;
        performanceGoals?: string | null;
        equipmentAccess?: string | null;
        parentPhone?: string | null;
        relationToAthlete?: string | null;
        desiredProgramType?:
          | "PHP"
          | "PHP_Premium"
          | "PHP_Premium_Plus"
          | "PHP_Pro";
        athleteProfilePicture?: string | null;
        planPaymentType: "monthly" | "upfront";
        planCommitmentMonths: 6 | 12;
        termsVersion: string;
        privacyVersion: string;
        appVersion: string;
        initialPassword?: string;
        extraResponses?: Record<string, unknown>;
      }
    >({
      query: (body) => ({
        url: "/admin/users/provision",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    provisionAdultAthlete: builder.mutation<
      {
        userId: number;
        athleteId: number;
        athleteUserId: number;
        status: string;
        emailSent: boolean;
      },
      {
        email: string;
        athleteName: string;
        birthDate: string;
        team?: string | null;
        trainingPerWeek: number;
        injuries?: unknown;
        growthNotes?: string | null;
        performanceGoals?: string | null;
        equipmentAccess?: string | null;
        desiredProgramType?:
          | "PHP"
          | "PHP_Premium"
          | "PHP_Premium_Plus"
          | "PHP_Pro"
          | null;
        athleteProfilePicture?: string | null;
        planPaymentType: "monthly" | "upfront";
        planCommitmentMonths: 6 | 12;
        termsVersion: string;
        privacyVersion: string;
        appVersion: string;
        initialPassword?: string;
        extraResponses?: Record<string, unknown>;
      }
    >({
      query: (body) => ({
        url: "/admin/users/provision-adult",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    getUserOnboarding: builder.query<UserOnboardingResponse, number>({
      query: (userId) => `/admin/users/${userId}/onboarding`,
      providesTags: ["Users"],
    }),
    getUserProgramSectionCompletions: builder.query<
      { items: any[] },
      { userId: number; from?: string; to?: string; limit?: number }
    >({
      query: ({ userId, from, to, limit }) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (limit != null) params.set("limit", String(limit));
        const suffix = params.toString() ? `?${params.toString()}` : "";
        return `/admin/users/${userId}/program-section-completions${suffix}`;
      },
      providesTags: ["Users"],
    }),
    updateProgramTier: builder.mutation<
      any,
      { athleteId: number; programTier: string }
    >({
      query: (body) => ({
        url: "/admin/users/program-tier",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateAthlete: builder.mutation<
      any,
      { athleteId: number; patch: { profilePicture?: string | null; currentProgramTier?: string | null } }
    >({
      query: ({ athleteId, patch }) => ({
        url: `/admin/athletes/${athleteId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Users"],
    }),
    getUserLocations: builder.query<
      { latest: any[]; history: any[]; rangeDays?: number | null },
      { days?: number } | void
    >({
      query: (params) => {
        if (!params?.days) return "/admin/user-locations";
        const query = new URLSearchParams();
        query.set("days", String(params.days));
        return `/admin/user-locations?${query.toString()}`;
      },
      providesTags: ["UserLocations"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useGetAdminTeamsQuery,
  useBlockUserMutation,
  useDeleteUserMutation,
  useProvisionGuardianMutation,
  useProvisionAdultAthleteMutation,
  useGetUserOnboardingQuery,
  useGetUserProgramSectionCompletionsQuery,
  useUpdateProgramTierMutation,
  useUpdateAthleteMutation,
  useGetUserLocationsQuery,
} = usersApi;

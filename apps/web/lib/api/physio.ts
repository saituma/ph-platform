import { apiSlice } from "../core";
import type { ApiPayload } from "../core";

const physioApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPhysioReferrals: builder.query<
      { items: any[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/admin/physio-referrals";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString
          ? `/admin/physio-referrals?${queryString}`
          : "/admin/physio-referrals";
      },
      providesTags: ["PhysioReferrals"],
    }),
    getReferralGroups: builder.query<{ items: any[] }, void>({
      query: () => "/admin/referral-groups",
      providesTags: ["PhysioReferrals"],
    }),
    createPhysioReferral: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/physio-referrals",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    createBulkPhysioReferral: builder.mutation<
      { created: any[]; summary: any; skipped: any[] },
      ApiPayload
    >({
      query: (body) => ({
        url: "/admin/physio-referrals/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    createReferralGroup: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/referral-groups",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    updatePhysioReferral: builder.mutation<
      { item: any },
      { id: number; data: ApiPayload }
    >({
      query: ({ id, data }) => ({
        url: `/admin/physio-referrals/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    deletePhysioReferral: builder.mutation<{ item: any }, { id: number }>({
      query: ({ id }) => ({
        url: `/admin/physio-referrals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    getAgeExperienceRules: builder.query<{ items: any[] }, void>({
      query: () => "/admin/age-experience",
      providesTags: ["AgeExperience"],
      keepUnusedDataFor: 600,
    }),
    createAgeExperienceRule: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/age-experience",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgeExperience"],
    }),
    updateAgeExperienceRule: builder.mutation<
      { item: any },
      { id: number; data: ApiPayload }
    >({
      query: ({ id, data }) => ({
        url: `/admin/age-experience/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["AgeExperience"],
    }),
    deleteAgeExperienceRule: builder.mutation<{ item: any }, { id: number }>({
      query: ({ id }) => ({
        url: `/admin/age-experience/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AgeExperience"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPhysioReferralsQuery,
  useGetReferralGroupsQuery,
  useCreatePhysioReferralMutation,
  useCreateBulkPhysioReferralMutation,
  useCreateReferralGroupMutation,
  useUpdatePhysioReferralMutation,
  useDeletePhysioReferralMutation,
  useGetAgeExperienceRulesQuery,
  useCreateAgeExperienceRuleMutation,
  useUpdateAgeExperienceRuleMutation,
  useDeleteAgeExperienceRuleMutation,
} = physioApi;

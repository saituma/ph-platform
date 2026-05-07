import { apiSlice } from "../core";
import type {
  TrainingSnapshotRow,
  AdminRunTrackingResponse,
  AdminTrainingQuestionnaireRow,
} from "../core";

const trackingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTrainingSnapshot: builder.query<{ items: TrainingSnapshotRow[] }, void>({
      query: () => "/admin/training-snapshot",
      providesTags: ["Users"],
    }),
    getAdminRunTracking: builder.query<
      AdminRunTrackingResponse,
      { userId?: number; teamId?: number; from?: string; to?: string; limit?: number } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.userId) query.set("userId", String(params.userId));
        if (params?.teamId) query.set("teamId", String(params.teamId));
        if (params?.from) query.set("from", params.from);
        if (params?.to) query.set("to", params.to);
        if (params?.limit) query.set("limit", String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return `/admin/tracking/runs${suffix}`;
      },
      providesTags: ["Users"],
    }),
    getTrackingGoals: builder.query<{ goals: any[] }, { status?: string } | void>({
      query: (params) => `/admin/tracking-goals${params?.status ? `?status=${params.status}` : ""}`,
      providesTags: ["TrackingGoals"],
    }),
    createTrackingGoal: builder.mutation<{ goal: any }, {
      title: string;
      description?: string;
      unit: string;
      customUnit?: string;
      targetValue: number;
      scope: string;
      athleteId?: number;
      audience: string;
      teamId?: number;
      dueDate?: string;
    }>({
      query: (body) => ({ url: "/admin/tracking-goals", method: "POST", body }),
      invalidatesTags: ["TrackingGoals"],
    }),
    updateTrackingGoal: builder.mutation<{ goal: any }, { id: number; data: { title?: string; description?: string; targetValue?: number; dueDate?: string; status?: string } }>({
      query: ({ id, data }) => ({ url: `/admin/tracking-goals/${id}`, method: "PATCH", body: data }),
      invalidatesTags: ["TrackingGoals"],
    }),
    deleteTrackingGoal: builder.mutation<{ goal: any }, { id: number }>({
      query: ({ id }) => ({ url: `/admin/tracking-goals/${id}`, method: "DELETE" }),
      invalidatesTags: ["TrackingGoals"],
    }),
    getAdminTrainingQuestionnaires: builder.query<
      { items: AdminTrainingQuestionnaireRow[] },
      { userId?: number; teamId?: number; from?: string; to?: string; limit?: number } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.userId) query.set("userId", String(params.userId));
        if (params?.teamId) query.set("teamId", String(params.teamId));
        if (params?.from) query.set("from", params.from);
        if (params?.to) query.set("to", params.to);
        if (params?.limit) query.set("limit", String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return `/admin/training-questionnaires${suffix}`;
      },
      providesTags: ["Users"],
    }),
    getYouthTrackingAthletes: builder.query<
      { athletes: { id: number; userId: number; name: string; age: number; team: string; teamId: number | null; youthTrackingEnabled: boolean; profilePicture: string | null }[] },
      void
    >({
      query: () => "/admin/youth-athletes/tracking",
      providesTags: ["YouthTracking"],
    }),
    toggleYouthTracking: builder.mutation<
      { athlete: { id: number; youthTrackingEnabled: boolean } },
      { athleteId: number; enabled: boolean }
    >({
      query: ({ athleteId, enabled }) => ({
        url: `/admin/youth-athletes/${athleteId}/tracking`,
        method: "PATCH",
        body: { enabled },
      }),
      invalidatesTags: ["YouthTracking"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTrainingSnapshotQuery,
  useGetAdminRunTrackingQuery,
  useGetTrackingGoalsQuery,
  useCreateTrackingGoalMutation,
  useUpdateTrackingGoalMutation,
  useDeleteTrackingGoalMutation,
  useGetAdminTrainingQuestionnairesQuery,
  useGetYouthTrackingAthletesQuery,
  useToggleYouthTrackingMutation,
} = trackingApi;

import { apiSlice } from "../core";
import type { MyScheduledSessionRecord } from "../core";

const sessionScheduleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyScheduledSessions: builder.query<
      { sessions: MyScheduledSessionRecord[] },
      { from?: string; to?: string } | void
    >({
      query: (params) => {
        if (!params || (!params.from && !params.to)) return "/sessions/my";
        const query = new URLSearchParams();
        if (params.from) query.set("from", params.from);
        if (params.to) query.set("to", params.to);
        return `/sessions/my?${query.toString()}`;
      },
      providesTags: ["SessionSchedule"],
    }),
    checkInScheduledSession: builder.mutation<{ ok: true }, number>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/check-in`,
        method: "POST",
      }),
      invalidatesTags: ["SessionSchedule"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetMyScheduledSessionsQuery, useCheckInScheduledSessionMutation } = sessionScheduleApi;

import { apiSlice } from "../core";

export interface WellbeingLogRecord {
  id: number;
  userId: number;
  dateKey: string;
  mood: number;
  energy: number;
  pain: number;
  notes: string | null;
  coachFeedback: string | null;
  coachId: number | null;
  createdAt: string;
  updatedAt: string;
}

const wellbeingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWellbeingLogs: builder.query<
      { logs: WellbeingLogRecord[] },
      { userId: number; limit?: number; from?: string; to?: string }
    >({
      query: (params) => {
        const query = new URLSearchParams();
        query.set("userId", String(params.userId));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.from) query.set("from", params.from);
        if (params.to) query.set("to", params.to);
        return `/wellbeing/logs?${query.toString()}`;
      },
      providesTags: ["WellbeingLogs"],
    }),
    reviewWellbeingLog: builder.mutation<
      { log: WellbeingLogRecord },
      { logId: number; feedback: string }
    >({
      query: ({ logId, feedback }) => ({
        url: `/wellbeing/logs/${logId}/feedback`,
        method: "POST",
        body: { feedback },
      }),
      invalidatesTags: ["WellbeingLogs"],
    }),
  }),
});

export const { useGetWellbeingLogsQuery, useReviewWellbeingLogMutation } = wellbeingApi;

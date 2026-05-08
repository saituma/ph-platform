import { apiSlice } from "../core";

export interface SleepLogRecord {
  id: number;
  userId: number;
  dateKey: string;
  totalMinutes: number;
  bedTime: string | null;
  wakeTime: string | null;
  quality: number | null;
  deepMinutes: number | null;
  lightMinutes: number | null;
  remMinutes: number | null;
  awakeMinutes: number | null;
  notes: string | null;
  coachFeedback: string | null;
  coachId: number | null;
  createdAt: string;
  updatedAt: string;
}

const sleepApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSleepLogs: builder.query<
      { logs: SleepLogRecord[] },
      { userId: number; limit?: number; from?: string; to?: string }
    >({
      query: (params) => {
        const query = new URLSearchParams();
        query.set("userId", String(params.userId));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.from) query.set("from", params.from);
        if (params.to) query.set("to", params.to);
        return `/sleep/logs?${query.toString()}`;
      },
      providesTags: ["SleepLogs"],
    }),
    reviewSleepLog: builder.mutation<
      { log: SleepLogRecord },
      { logId: number; feedback: string }
    >({
      query: ({ logId, feedback }) => ({
        url: `/sleep/logs/${logId}/feedback`,
        method: "POST",
        body: { feedback },
      }),
      invalidatesTags: ["SleepLogs"],
    }),
  }),
});

export const { useGetSleepLogsQuery, useReviewSleepLogMutation } = sleepApi;

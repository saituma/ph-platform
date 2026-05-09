import { apiSlice } from "../core";

export type BetaTesterRecord = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  reason: string | null;
  createdAt: string;
};

const betaTestersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBetaTesters: builder.query<
      { items: BetaTesterRecord[]; total: number },
      void
    >({
      query: () => "/admin/beta-testers",
      providesTags: ["BetaTesters"],
    }),
    getBetaTesterStats: builder.query<{ count: number }, void>({
      query: () => "/admin/beta-testers/stats",
      providesTags: ["BetaTesters"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBetaTestersQuery,
  useGetBetaTesterStatsQuery,
} = betaTestersApi;

import { apiSlice } from "../core";

export type ReferralClaim = {
  id: number;
  claimedAt: string;
  joineeName: string | null;
  joineeEmail: string | null;
  joineeId: number;
};

export type ReferrerRow = {
  referrerId: number;
  referrerName: string | null;
  referrerEmail: string | null;
  referrerRole: string | null;
  code: string;
  codeCreatedAt: string;
  totalReferred: number;
  claims: ReferralClaim[];
};

export type AdminReferralOverview = {
  totalCodes: number;
  totalClaims: number;
  referrers: ReferrerRow[];
};

const referralsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminReferrals: builder.query<AdminReferralOverview, void>({
      query: () => "/admin/referrals",
    }),
  }),
});

export const { useGetAdminReferralsQuery } = referralsApi;

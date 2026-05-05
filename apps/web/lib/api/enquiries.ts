import { apiSlice } from "../core";
import type { EnquiryRecord } from "../core";

const enquiriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEnquiries: builder.query<
      { items: EnquiryRecord[]; total: number; page: number; limit: number },
      { status?: string; service?: string; search?: string; page?: number; limit?: number; sort?: string } | void
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.status) q.set("status", params.status);
        if (params?.service) q.set("service", params.service);
        if (params?.search) q.set("search", params.search);
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.sort) q.set("sort", params.sort);
        const qs = q.toString();
        return qs ? `/admin/enquiries?${qs}` : "/admin/enquiries";
      },
      providesTags: ["Enquiries"],
    }),
    getEnquiryStats: builder.query<
      { total: number; byStatus: Record<string, number>; byService: Record<string, number> },
      { from?: string; to?: string } | void
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.from) q.set("from", params.from);
        if (params?.to) q.set("to", params.to);
        const qs = q.toString();
        return qs ? `/admin/enquiries/stats?${qs}` : "/admin/enquiries/stats";
      },
      providesTags: ["Enquiries"],
    }),
    updateEnquiry: builder.mutation<
      { ok: boolean; enquiry: EnquiryRecord },
      { id: number; status: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/enquiries/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Enquiries"],
    }),
    deleteEnquiry: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({
        url: `/admin/enquiries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Enquiries"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEnquiriesQuery,
  useGetEnquiryStatsQuery,
  useUpdateEnquiryMutation,
  useDeleteEnquiryMutation,
} = enquiriesApi;

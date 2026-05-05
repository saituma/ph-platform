import { apiSlice } from "../core";

const mediaApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getVideoUploads: builder.query<
      { items: any[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/admin/videos";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString ? `/admin/videos?${queryString}` : "/admin/videos";
      },
      providesTags: ["Content"],
    }),
    reviewVideoUpload: builder.mutation<
      { item: any },
      { uploadId: number; feedback: string }
    >({
      query: (body) => ({
        url: "/videos/review",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    createMediaUploadUrl: builder.mutation<
      { uploadUrl: string; publicUrl: string; key: string },
      {
        folder: string;
        fileName: string;
        contentType: string;
        sizeBytes: number;
        client?: "web" | "native";
      }
    >({
      query: (body) => ({
        url: "/media/presign",
        method: "POST",
        body,
      }),
    }),
    presignMediaUpload: builder.mutation<
      { uploadUrl: string; publicUrl: string; key: string },
      {
        folder: string;
        fileName: string;
        contentType: string;
        sizeBytes: number;
        client?: "web" | "native";
      }
    >({
      query: (body) => ({
        url: "/media/presign",
        method: "POST",
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetVideoUploadsQuery,
  useReviewVideoUploadMutation,
  useCreateMediaUploadUrlMutation,
  usePresignMediaUploadMutation,
} = mediaApi;

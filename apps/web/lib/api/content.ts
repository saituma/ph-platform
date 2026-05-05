import { apiSlice } from "../core";
import type { ApiPayload } from "../core";

const contentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getParentContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/parent-platform",
      providesTags: ["Content"],
      keepUnusedDataFor: 600,
    }),
    getHomeContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/home",
      providesTags: ["Content"],
      keepUnusedDataFor: 600,
    }),
    getGalleryItems: builder.query<{ items: Array<{ id: number; url: string; thumbnail: string | null; caption: string; mediaType: "photo" | "video"; createdAt: string }> }, void>({
      query: () => "/content/gallery",
      providesTags: ["Content"],
    }),
    getLegalContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/legal",
      providesTags: ["Content"],
    }),
    getAnnouncements: builder.query<{ items: any[] }, void>({
      query: () => "/content/announcements",
      providesTags: ["Content"],
    }),
    getOpenGraph: builder.query<{ data: any }, { url: string }>({
      query: ({ url }) => `/open-graph?url=${encodeURIComponent(url)}`,
    }),
    getTestimonialSubmissions: builder.query<{ items: any[] }, void>({
      query: () => "/content/testimonials/submissions",
      providesTags: ["TestimonialSubmissions"],
    }),
    approveTestimonialSubmission: builder.mutation<
      { approved: boolean },
      { submissionId: number }
    >({
      query: ({ submissionId }) => ({
        url: `/content/testimonials/${submissionId}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["TestimonialSubmissions", "Content"],
    }),
    rejectTestimonialSubmission: builder.mutation<
      { rejected: boolean },
      { submissionId: number }
    >({
      query: ({ submissionId }) => ({
        url: `/content/testimonials/${submissionId}/reject`,
        method: "POST",
      }),
      invalidatesTags: ["TestimonialSubmissions"],
    }),
    getParentCourses: builder.query<{ items: any[] }, void>({
      query: () => "/content/parent-courses",
      providesTags: ["ParentCourses"],
      keepUnusedDataFor: 600,
    }),
    getParentCourse: builder.query<{ item: any }, number>({
      query: (courseId) => `/content/parent-courses/${courseId}`,
      providesTags: (_result, _error, courseId) => [
        { type: "ParentCourses", id: courseId },
      ],
    }),
    createParentCourse: builder.mutation<{ item: any }, ApiPayload>({
      query: (body) => ({
        url: "/content/parent-courses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ParentCourses"],
    }),
    updateParentCourse: builder.mutation<
      { item: any },
      { id: number; data: ApiPayload }
    >({
      query: ({ id, data }) => ({
        url: `/content/parent-courses/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ParentCourses"],
    }),
    deleteParentCourse: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `/content/parent-courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ParentCourses"],
    }),
    updateContent: builder.mutation<
      { item: any },
      { id: number; data: ApiPayload }
    >({
      query: ({ id, data }) => ({
        url: `/content/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Content"],
    }),
    createContent: builder.mutation<any, ApiPayload>({
      query: (body) => ({
        url: "/content",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    deleteContent: builder.mutation<{ deleted: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `/content/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Content"],
    }),
    getProgramSectionContent: builder.query<
      { items: any[] },
      { sectionType: string }
    >({
      query: ({ sectionType }) =>
        `/program-section-content?sectionType=${encodeURIComponent(sectionType)}`,
      providesTags: ["Content"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetParentContentQuery,
  useGetHomeContentQuery,
  useGetGalleryItemsQuery,
  useGetLegalContentQuery,
  useGetAnnouncementsQuery,
  useGetOpenGraphQuery,
  useGetTestimonialSubmissionsQuery,
  useApproveTestimonialSubmissionMutation,
  useRejectTestimonialSubmissionMutation,
  useGetParentCoursesQuery,
  useGetParentCourseQuery,
  useCreateParentCourseMutation,
  useUpdateParentCourseMutation,
  useDeleteParentCourseMutation,
  useUpdateContentMutation,
  useCreateContentMutation,
  useDeleteContentMutation,
  useGetProgramSectionContentQuery,
} = contentApi;

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api/backend",
  prepareHeaders: (headers) => {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
    return headers;
  },
});

/**
 * Wrapper that silently refreshes the access token on 401,
 * then retries the original request. Redirects to /login if
 * the refresh itself fails.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to silently refresh the access token
    const csrfToken = getCsrfToken();
    const refreshResult = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
    });

    if (refreshResult.ok) {
      // Retry the original request with the new token
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // Refresh failed — session is truly expired
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Users",
    "Bookings",
    "Threads",
    "Content",
    "Services",
    "Dashboard",
    "OnboardingConfig",
    "ParentCourses",
    "TestimonialSubmissions",
    "Availability",
    "FoodDiary",
    "PhysioReferrals",
    "Programs",
    "AgeExperience",
    "UserLocations",
  ],
  endpoints: (builder) => ({
    getAdminProfile: builder.query<any, void>({
      query: () => "/admin/profile",
    }),
    updateAdminProfile: builder.mutation<any, any>({
      query: (body) => ({
        url: "/admin/profile",
        method: "PUT",
        body,
      }),
    }),
    updateAdminPreferences: builder.mutation<any, any>({
      query: (body) => ({
        url: "/admin/preferences",
        method: "PUT",
        body,
      }),
    }),
    changePassword: builder.mutation<any, { oldPassword: string; newPassword: string }>({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
    }),
    getDashboard: builder.query<any, void>({
      query: () => "/admin/dashboard",
      providesTags: ["Dashboard"],
    }),
    getTrainingSnapshot: builder.query<{ items: any[] }, void>({
      query: () => "/admin/training-snapshot",
      providesTags: ["Users"],
    }),
    getUserLocations: builder.query<{ latest: any[]; history: any[]; rangeDays?: number | null }, { days?: number } | void>({
      query: (params) => {
        if (!params?.days) return "/admin/user-locations";
        const query = new URLSearchParams();
        query.set("days", String(params.days));
        return `/admin/user-locations?${query.toString()}`;
      },
      providesTags: ["UserLocations"],
    }),
    getUsers: builder.query<{ users: any[] }, void>({
      query: () => "/admin/users",
      providesTags: ["Users"],
    }),
    blockUser: builder.mutation<any, { userId: number; blocked: boolean }>({
      query: ({ userId, blocked }) => ({
        url: `/admin/users/${userId}/block`,
        method: "POST",
        body: { blocked },
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<any, { userId: number }>({
      query: ({ userId }) => ({
        url: `/admin/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    getBookings: builder.query<{ bookings: any[] }, void>({
      query: () => "/admin/bookings",
      providesTags: ["Bookings"],
    }),
    getBookingById: builder.query<{ booking: any }, number>({
      query: (bookingId) => `/admin/bookings/${bookingId}`,
      providesTags: ["Bookings"],
    }),
    getUserBookings: builder.query<{ items: any[] }, void>({
      query: () => "/bookings",
      providesTags: ["Bookings"],
    }),
    updateBookingStatus: builder.mutation<any, { bookingId: number; status: string }>({
      query: ({ bookingId, status }) => ({
        url: `/admin/bookings/${bookingId}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Bookings"],
    }),
    createAdminBooking: builder.mutation<
      any,
      {
        userId: number;
        serviceTypeId: number;
        startsAt: string;
        endsAt: string;
        location?: string | null;
        meetingLink?: string | null;
        status?: string;
      }
    >({
      query: (body) => ({
        url: "/admin/bookings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Bookings"],
    }),
    getAdminAvailability: builder.query<{ items: any[] }, void>({
      query: () => "/admin/availability",
      providesTags: ["Availability"],
    }),
    getVideoUploads: builder.query<{ items: any[] }, void>({
      query: () => "/admin/videos",
      providesTags: ["Content"],
    }),
    getProgramSectionContent: builder.query<{ items: any[] }, { sectionType: string }>({
      query: ({ sectionType }) => `/program-section-content?sectionType=${encodeURIComponent(sectionType)}`,
      providesTags: ["Content"],
    }),
    getServices: builder.query<{ items: any[] }, void>({
      query: () => "/bookings/services?includeInactive=true",
      providesTags: ["Services"],
    }),
    getBookingServices: builder.query<{ items: any[] }, void>({
      query: () => "/bookings/services",
      providesTags: ["Services"],
    }),
    getBookingAvailability: builder.query<
      { items: any[]; bookings?: any[] },
      { serviceTypeId: number; from: string; to: string }
    >({
      query: ({ serviceTypeId, from, to }) => {
        const query = new URLSearchParams();
        query.set("serviceTypeId", String(serviceTypeId));
        query.set("from", from);
        query.set("to", to);
        return `/bookings/availability?${query.toString()}`;
      },
      providesTags: ["Availability"],
    }),
    createBooking: builder.mutation<
      any,
      {
        serviceTypeId: number;
        startsAt: string;
        endsAt: string;
        location?: string;
        meetingLink?: string;
        timezoneOffsetMinutes?: number;
      }
    >({
      query: (body) => ({
        url: "/bookings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Bookings"],
    }),
    getThreads: builder.query<{ threads: any[] }, void>({
      query: () => "/admin/messages/threads",
      providesTags: ["Threads"],
    }),
    getMessages: builder.query<{ messages: any[] }, number>({
      query: (userId) => `/admin/messages/${userId}`,
      providesTags: (result, error, userId) => [{ type: "Threads", id: userId } as any],
    }),
    getParentContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/parent-platform",
      providesTags: ["Content"],
    }),
    getHomeContent: builder.query<{ items: any[] }, void>({
      query: () => "/content/home",
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
    getTestimonialSubmissions: builder.query<{ items: any[] }, void>({
      query: () => "/content/testimonials/submissions",
      providesTags: ["TestimonialSubmissions"],
    }),
    approveTestimonialSubmission: builder.mutation<{ approved: boolean }, { submissionId: number }>({
      query: ({ submissionId }) => ({
        url: `/content/testimonials/${submissionId}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["TestimonialSubmissions", "Content"],
    }),
    rejectTestimonialSubmission: builder.mutation<{ rejected: boolean }, { submissionId: number }>({
      query: ({ submissionId }) => ({
        url: `/content/testimonials/${submissionId}/reject`,
        method: "POST",
      }),
      invalidatesTags: ["TestimonialSubmissions"],
    }),
    getParentCourses: builder.query<{ items: any[] }, void>({
      query: () => "/content/parent-courses",
      providesTags: ["ParentCourses"],
    }),
    getFoodDiary: builder.query<{ items: any[] }, { athleteId?: number; guardianId?: number } | void>({
      query: (params) => {
        if (!params) return "/admin/food-diary";
        const query = new URLSearchParams();
        if (params.athleteId) query.set("athleteId", String(params.athleteId));
        if (params.guardianId) query.set("guardianId", String(params.guardianId));
        return `/admin/food-diary?${query.toString()}`;
      },
      providesTags: ["FoodDiary"],
    }),
    reviewFoodDiary: builder.mutation<{ item: any }, { entryId: number; feedback?: string | null }>({
      query: ({ entryId, feedback }) => ({
        url: `/admin/food-diary/${entryId}/review`,
        method: "POST",
        body: { feedback: feedback ?? "" },
      }),
      invalidatesTags: ["FoodDiary"],
    }),
    getPhysioReferrals: builder.query<{ items: any[] }, void>({
      query: () => "/admin/physio-referrals",
      providesTags: ["PhysioReferrals"],
    }),
    getAgeExperienceRules: builder.query<{ items: any[] }, void>({
      query: () => "/admin/age-experience",
      providesTags: ["AgeExperience"],
    }),
    createAgeExperienceRule: builder.mutation<{ item: any }, any>({
      query: (body) => ({
        url: "/admin/age-experience",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgeExperience"],
    }),
    updateAgeExperienceRule: builder.mutation<{ item: any }, { id: number; data: any }>({
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
    createPhysioReferral: builder.mutation<{ item: any }, any>({
      query: (body) => ({
        url: "/admin/physio-referrals",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PhysioReferrals"],
    }),
    updatePhysioReferral: builder.mutation<{ item: any }, { id: number; data: any }>({
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
    createMediaUploadUrl: builder.mutation<
      { uploadUrl: string; publicUrl: string; key: string },
      { folder: string; fileName: string; contentType: string; sizeBytes: number }
    >({
      query: (body) => ({
        url: "/media/presign",
        method: "POST",
        body,
      }),
    }),
    getParentCourse: builder.query<{ item: any }, number>({
      query: (courseId) => `/content/parent-courses/${courseId}`,
      providesTags: (result, error, courseId) => [{ type: "ParentCourses", id: courseId } as any],
    }),
    createParentCourse: builder.mutation<{ item: any }, any>({
      query: (body) => ({
        url: "/content/parent-courses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ParentCourses"],
    }),
    updateParentCourse: builder.mutation<{ item: any }, { id: number; data: any }>({
      query: ({ id, data }) => ({
        url: `/content/parent-courses/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ParentCourses"],
    }),
    updateContent: builder.mutation<{ item: any }, { id: number; data: any }>({
      query: ({ id, data }) => ({
        url: `/content/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Content"],
    }),
    markThreadRead: builder.mutation<{ updated: number }, { userId: number }>({
      query: ({ userId }) => ({
        url: `/admin/messages/${userId}/read`,
        method: "POST",
      }),
      invalidatesTags: ["Threads"],
    }),
    deleteThread: builder.mutation<{ deleted: number }, { userId: number }>({
      query: ({ userId }) => ({
        url: `/admin/messages/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Threads"],
    }),
    sendMessage: builder.mutation<
      { message: any },
      {
        userId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
        videoUploadId?: number;
      }
    >({
      query: ({ userId, content, contentType, mediaUrl, videoUploadId }) => ({
        url: `/admin/messages/${userId}`,
        method: "POST",
        body: { content, contentType, mediaUrl, videoUploadId },
      }),
      invalidatesTags: ["Threads"],
    }),
    toggleMessageReaction: builder.mutation<
      { messageId: number; reactions: { emoji: string; count: number; userIds: number[] }[] },
      { messageId: number; emoji: string }
    >({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: "PUT",
        body: { emoji },
      }),
    }),
    deleteMessage: builder.mutation<{ deleted: boolean }, { messageId: number }>({
      query: ({ messageId }) => ({
        url: `/messages/${messageId}`,
        method: "DELETE",
      }),
    }),
    deleteGroupMessage: builder.mutation<{ deleted: boolean }, { groupId: number; messageId: number }>({
      query: ({ groupId, messageId }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}`,
        method: "DELETE",
      }),
    }),
    createService: builder.mutation<any, any>({
      query: (body) => ({
        url: "/bookings/services",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Services", "Bookings"],
    }),
    updateService: builder.mutation<any, { id: number; data: any }>({
      query: ({ id, data }) => ({
        url: `/bookings/services/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Services", "Bookings"],
    }),
    createAvailability: builder.mutation<any, any>({
      query: (body) => ({
        url: "/bookings/availability",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Availability"],
    }),
    createContent: builder.mutation<any, any>({
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
    reviewVideoUpload: builder.mutation<{ item: any }, { uploadId: number; feedback: string }>({
      query: (body) => ({
        url: "/videos/review",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    getUserOnboarding: builder.query<any, number>({
      query: (userId) => `/admin/users/${userId}/onboarding`,
      providesTags: ["Users"],
    }),
    getUserProgramSectionCompletions: builder.query<
      { items: any[] },
      { userId: number; from?: string; to?: string; limit?: number }
    >({
      query: ({ userId, from, to, limit }) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (limit != null) params.set("limit", String(limit));
        const suffix = params.toString() ? `?${params.toString()}` : "";
        return `/admin/users/${userId}/program-section-completions${suffix}`;
      },
      providesTags: ["Users"],
    }),
    getExercises: builder.query<{ exercises: any[] }, void>({
      query: () => "/admin/exercises",
      providesTags: ["Content"],
      transformResponse: (response: any) => ({ exercises: response?.exercises ?? [] }),
    }),
    createExercise: builder.mutation<
      { exercise: any },
      {
        name: string;
        cues?: string;
        sets?: number;
        reps?: number;
        duration?: number;
        restSeconds?: number;
        notes?: string;
        videoUrl?: string;
      }
    >({
      query: (body) => ({
        url: "/admin/exercises",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    presignMediaUpload: builder.mutation<
      { uploadUrl: string; publicUrl: string; key: string },
      { folder: string; fileName: string; contentType: string; sizeBytes: number }
    >({
      query: (body) => ({
        url: "/media/presign",
        method: "POST",
        body,
      }),
    }),
    getUserPremiumPlan: builder.query<{ items: any[] }, { userId: number; weekNumber?: number }>({
      query: ({ userId, weekNumber }) => ({
        url: `/admin/users/${userId}/premium-plan`,
        params: weekNumber ? { weekNumber } : undefined,
      }),
      providesTags: ["Users"],
    }),
    cloneUserPremiumPlan: builder.mutation<{ result: any }, { userId: number; replaceExisting?: boolean }>({
      query: ({ userId, replaceExisting }) => ({
        url: `/admin/users/${userId}/premium-plan/clone`,
        method: "POST",
        body: { replaceExisting: replaceExisting ?? true },
      }),
      invalidatesTags: ["Users"],
    }),
    createUserPremiumPlanSession: builder.mutation<{ item: any }, { userId: number; weekNumber: number; sessionNumber: number; title?: string | null; notes?: string | null }>({
      query: ({ userId, ...body }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserPremiumPlanSession: builder.mutation<{ item: any }, { userId: number; sessionId: number; patch: any }>({
      query: ({ userId, sessionId, patch }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions/${sessionId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUserPremiumPlanSession: builder.mutation<{ item: any }, { userId: number; sessionId: number }>({
      query: ({ userId, sessionId }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions/${sessionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    addUserPremiumPlanExercise: builder.mutation<{ item: any }, { userId: number; sessionId: number; body: any }>({
      query: ({ userId, sessionId, body }) => ({
        url: `/admin/users/${userId}/premium-plan/sessions/${sessionId}/exercises`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserPremiumPlanExercise: builder.mutation<{ item: any }, { userId: number; planExerciseId: number; patch: any }>({
      query: ({ userId, planExerciseId, patch }) => ({
        url: `/admin/users/${userId}/premium-plan/exercises/${planExerciseId}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUserPremiumPlanExercise: builder.mutation<{ item: any }, { userId: number; planExerciseId: number }>({
      query: ({ userId, planExerciseId }) => ({
        url: `/admin/users/${userId}/premium-plan/exercises/${planExerciseId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    updateProgramTier: builder.mutation<any, { athleteId: number; programTier: string }>({
      query: (body) => ({
        url: "/admin/users/program-tier",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    assignProgram: builder.mutation<any, { athleteId: number; programType: string; programTemplateId?: number }>({
      query: (body) => ({
        url: "/admin/enrollments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    getPrograms: builder.query<{ programs: any[] }, void>({
      query: () => "/admin/programs",
      providesTags: ["Programs"],
    }),
    createProgram: builder.mutation<
      { program: any },
      { name: string; type: string; description?: string; minAge?: number | null; maxAge?: number | null }
    >({
      query: (body) => ({
        url: "/admin/programs",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Programs"],
    }),
    updateProgram: builder.mutation<
      { program: any },
      {
        programId: number;
        data: { name?: string; type?: string; description?: string | null; minAge?: number | null; maxAge?: number | null };
      }
    >({
      query: ({ programId, data }) => ({
        url: `/admin/programs/${programId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Programs"],
    }),
    getOnboardingConfig: builder.query<{ config: any }, void>({
      query: () => "/admin/onboarding-config",
      providesTags: ["OnboardingConfig"],
    }),
    getPhpPlusTabs: builder.query<{ tabs: string[] }, void>({
      query: () => "/admin/php-plus-tabs",
    }),
    updateOnboardingConfig: builder.mutation<{ config: any }, any>({
      query: (body) => ({
        url: "/admin/onboarding-config",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["OnboardingConfig"],
    }),
    updatePhpPlusTabs: builder.mutation<{ config: any }, { tabs: string[] }>({
      query: (body) => ({
        url: "/admin/php-plus-tabs",
        method: "PUT",
        body,
      }),
    }),
    getChatGroups: builder.query<{ groups: any[] }, void>({
      query: () => "/chat/groups",
    }),
    createChatGroup: builder.mutation<{ group: any }, { name: string; memberIds: number[] }>({
      query: (body) => ({
        url: "/chat/groups",
        method: "POST",
        body,
      }),
    }),
    addChatGroupMembers: builder.mutation<{ ok: boolean }, { groupId: number; memberIds: number[] }>({
      query: ({ groupId, memberIds }) => ({
        url: `/chat/groups/${groupId}/members`,
        method: "POST",
        body: { memberIds },
      }),
    }),
    getChatGroupMembers: builder.query<{ members: any[] }, number>({
      query: (groupId) => `/chat/groups/${groupId}/members`,
    }),
    getChatGroupMessages: builder.query<{ messages: any[] }, number>({
      query: (groupId) => `/chat/groups/${groupId}/messages`,
    }),
    sendChatGroupMessage: builder.mutation<
      { message: any },
      {
        groupId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
      }
    >({
      query: ({ groupId, content, contentType, mediaUrl }) => ({
        url: `/chat/groups/${groupId}/messages`,
        method: "POST",
        body: { content, contentType, mediaUrl },
      }),
    }),
    toggleChatGroupMessageReaction: builder.mutation<
      { messageId: number; reactions: { emoji: string; count: number; userIds: number[] }[] },
      { groupId: number; messageId: number; emoji: string }
    >({
      query: ({ groupId, messageId, emoji }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}/reactions`,
        method: "PUT",
        body: { emoji },
      }),
    }),
  }),
});

export const {
  useGetAdminProfileQuery,
  useUpdateAdminProfileMutation,
  useUpdateAdminPreferencesMutation,
  useChangePasswordMutation,
  useGetDashboardQuery,
  useGetTrainingSnapshotQuery,
  useGetUserLocationsQuery,
  useGetUsersQuery,
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useGetUserBookingsQuery,
  useUpdateBookingStatusMutation,
  useCreateAdminBookingMutation,
  useGetAdminAvailabilityQuery,
  useGetVideoUploadsQuery,
  useGetProgramSectionContentQuery,
  useGetServicesQuery,
  useGetBookingServicesQuery,
  useGetBookingAvailabilityQuery,
  useCreateBookingMutation,
  useGetThreadsQuery,
  useGetMessagesQuery,
  useGetParentContentQuery,
  useGetHomeContentQuery,
  useGetLegalContentQuery,
  useGetAnnouncementsQuery,
  useGetTestimonialSubmissionsQuery,
  useApproveTestimonialSubmissionMutation,
  useRejectTestimonialSubmissionMutation,
  useGetParentCoursesQuery,
  useGetFoodDiaryQuery,
  useReviewFoodDiaryMutation,
  useGetPhysioReferralsQuery,
  useCreatePhysioReferralMutation,
  useUpdatePhysioReferralMutation,
  useDeletePhysioReferralMutation,
  useGetAgeExperienceRulesQuery,
  useCreateAgeExperienceRuleMutation,
  useUpdateAgeExperienceRuleMutation,
  useDeleteAgeExperienceRuleMutation,
  useGetParentCourseQuery,
  useCreateMediaUploadUrlMutation,
  useCreateParentCourseMutation,
  useUpdateParentCourseMutation,
  useUpdateContentMutation,
  useMarkThreadReadMutation,
  useSendMessageMutation,
  useToggleMessageReactionMutation,
  useDeleteMessageMutation,
  useDeleteGroupMessageMutation,
  useDeleteThreadMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useCreateAvailabilityMutation,
  useCreateContentMutation,
  useDeleteContentMutation,
  useReviewVideoUploadMutation,
  useGetUserOnboardingQuery,
  useGetUserProgramSectionCompletionsQuery,
  useGetExercisesQuery,
  useCreateExerciseMutation,
  usePresignMediaUploadMutation,
  useGetUserPremiumPlanQuery,
  useCloneUserPremiumPlanMutation,
  useCreateUserPremiumPlanSessionMutation,
  useUpdateUserPremiumPlanSessionMutation,
  useDeleteUserPremiumPlanSessionMutation,
  useAddUserPremiumPlanExerciseMutation,
  useUpdateUserPremiumPlanExerciseMutation,
  useDeleteUserPremiumPlanExerciseMutation,
  useUpdateProgramTierMutation,
  useAssignProgramMutation,
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useGetOnboardingConfigQuery,
  useUpdateOnboardingConfigMutation,
  useGetPhpPlusTabsQuery,
  useUpdatePhpPlusTabsMutation,
  useGetChatGroupsQuery,
  useCreateChatGroupMutation,
  useAddChatGroupMembersMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useSendChatGroupMessageMutation,
  useToggleChatGroupMessageReactionMutation,
} = apiSlice;

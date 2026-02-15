import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/backend",
  }),
  tagTypes: ["Users", "Bookings", "Threads", "Content", "Services", "Dashboard", "OnboardingConfig", "ParentCourses", "Availability"],
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
    getAdminAvailability: builder.query<{ items: any[] }, void>({
      query: () => "/admin/availability",
      providesTags: ["Availability"],
    }),
    getVideoUploads: builder.query<{ items: any[] }, void>({
      query: () => "/admin/videos",
      providesTags: ["Content"],
    }),
    getServices: builder.query<{ items: any[] }, void>({
      query: () => "/bookings/services?includeInactive=true",
      providesTags: ["Services"],
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
    getParentCourses: builder.query<{ items: any[] }, void>({
      query: () => "/content/parent-courses",
      providesTags: ["ParentCourses"],
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
    sendMessage: builder.mutation<
      { message: any },
      {
        userId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
      }
    >({
      query: ({ userId, content, contentType, mediaUrl }) => ({
        url: `/admin/messages/${userId}`,
        method: "POST",
        body: { content, contentType, mediaUrl },
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
    }),
    updateProgramTier: builder.mutation<any, { athleteId: number; programTier: string }>({
      query: (body) => ({
        url: "/admin/users/program-tier",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    assignProgram: builder.mutation<any, { athleteId: number; programType: string }>({
      query: (body) => ({
        url: "/admin/enrollments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    getOnboardingConfig: builder.query<{ config: any }, void>({
      query: () => "/admin/onboarding-config",
      providesTags: ["OnboardingConfig"],
    }),
    updateOnboardingConfig: builder.mutation<{ config: any }, any>({
      query: (body) => ({
        url: "/admin/onboarding-config",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["OnboardingConfig"],
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
  useGetUsersQuery,
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetBookingsQuery,
  useGetAdminAvailabilityQuery,
  useGetVideoUploadsQuery,
  useGetServicesQuery,
  useGetThreadsQuery,
  useGetMessagesQuery,
  useGetParentContentQuery,
  useGetParentCoursesQuery,
  useGetParentCourseQuery,
  useCreateMediaUploadUrlMutation,
  useCreateParentCourseMutation,
  useUpdateParentCourseMutation,
  useUpdateContentMutation,
  useMarkThreadReadMutation,
  useSendMessageMutation,
  useToggleMessageReactionMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useCreateAvailabilityMutation,
  useCreateContentMutation,
  useReviewVideoUploadMutation,
  useGetUserOnboardingQuery,
  useUpdateProgramTierMutation,
  useAssignProgramMutation,
  useGetOnboardingConfigQuery,
  useUpdateOnboardingConfigMutation,
  useGetChatGroupsQuery,
  useCreateChatGroupMutation,
  useAddChatGroupMembersMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useSendChatGroupMessageMutation,
  useToggleChatGroupMessageReactionMutation,
} = apiSlice;

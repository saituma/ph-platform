import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/backend",
  }),
  tagTypes: ["Users", "Bookings", "Threads", "Content", "Services", "Dashboard", "OnboardingConfig"],
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
    getServices: builder.query<{ items: any[] }, void>({
      query: () => "/bookings/services",
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
    sendMessage: builder.mutation<{ message: any }, { userId: number; content: string }>({
      query: ({ userId, content }) => ({
        url: `/admin/messages/${userId}`,
        method: "POST",
        body: { content },
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
    createAvailability: builder.mutation<any, any>({
      query: (body) => ({
        url: "/bookings/availability",
        method: "POST",
        body,
      }),
    }),
    createContent: builder.mutation<any, any>({
      query: (body) => ({
        url: "/content",
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
    sendChatGroupMessage: builder.mutation<{ message: any }, { groupId: number; content: string }>({
      query: ({ groupId, content }) => ({
        url: `/chat/groups/${groupId}/messages`,
        method: "POST",
        body: { content },
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
  useGetServicesQuery,
  useGetThreadsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useToggleMessageReactionMutation,
  useCreateServiceMutation,
  useCreateAvailabilityMutation,
  useCreateContentMutation,
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

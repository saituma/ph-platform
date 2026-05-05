import { apiSlice } from "../core";

const messagingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getThreads: builder.query<
      { threads: any[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/admin/messages/threads";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString
          ? `/admin/messages/threads?${queryString}`
          : "/admin/messages/threads";
      },
      providesTags: ["Threads"],
    }),
    getMessagingInbox: builder.query<
      { threads: any[] },
      { limit?: number; includeAdminThreads?: boolean } | void
    >({
      query: (params) => {
        if (!params) return "/messages/inbox";
        const query = new URLSearchParams();
        if (params.limit) query.set("limit", String(params.limit));
        if (typeof params.includeAdminThreads === "boolean") {
          query.set("includeAdminThreads", params.includeAdminThreads ? "1" : "0");
        }
        const queryString = query.toString();
        return queryString ? `/messages/inbox?${queryString}` : "/messages/inbox";
      },
      providesTags: ["Threads", "ChatGroups"],
    }),
    getMessages: builder.query<{ messages: any[] }, number>({
      query: (userId) => `/admin/messages/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: "Threads", id: userId },
      ],
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
        replyToMessageId?: number;
        replyPreview?: string;
      }
    >({
      query: ({
        userId,
        content,
        contentType,
        mediaUrl,
        videoUploadId,
        replyToMessageId,
        replyPreview,
      }) => ({
        url: `/admin/messages/${userId}`,
        method: "POST",
        body: {
          content,
          contentType,
          mediaUrl,
          videoUploadId,
          replyToMessageId,
          replyPreview,
        },
      }),
      invalidatesTags: ["Threads"],
    }),
    toggleMessageReaction: builder.mutation<
      {
        messageId: number;
        reactions: { emoji: string; count: number; userIds: number[] }[];
      },
      { messageId: number; emoji: string }
    >({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: "PUT",
        body: { emoji },
      }),
      invalidatesTags: ["Threads"],
    }),
    deleteMessage: builder.mutation<
      { deleted: boolean },
      { messageId: number }
    >({
      query: ({ messageId }) => ({
        url: `/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Threads"],
    }),
    deleteGroupMessage: builder.mutation<
      { deleted: boolean },
      { groupId: number; messageId: number }
    >({
      query: ({ groupId, messageId }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ChatGroups"],
    }),
    getChatGroups: builder.query<
      { groups: any[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/chat/groups";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString ? `/chat/groups?${queryString}` : "/chat/groups";
      },
      providesTags: ["ChatGroups"],
    }),
    createChatGroup: builder.mutation<
      { group: any },
      {
        name: string;
        category?: "announcement" | "coach_group" | "team";
        memberIds: number[];
      }
    >({
      query: (body) => ({
        url: "/chat/groups",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ChatGroups"],
    }),
    addChatGroupMembers: builder.mutation<
      { ok: boolean },
      { groupId: number; memberIds: number[] }
    >({
      query: ({ groupId, memberIds }) => ({
        url: `/chat/groups/${groupId}/members`,
        method: "POST",
        body: { memberIds },
      }),
      invalidatesTags: ["ChatGroups"],
    }),
    getChatGroupMembers: builder.query<{ members: any[] }, number>({
      query: (groupId) => `/chat/groups/${groupId}/members`,
    }),
    getChatGroupMessages: builder.query<{ messages: any[] }, number>({
      query: (groupId) => `/chat/groups/${groupId}/messages`,
    }),
    markChatGroupRead: builder.mutation<{ ok: boolean }, { groupId: number }>({
      query: ({ groupId }) => ({
        url: `/chat/groups/${groupId}/read`,
        method: "POST",
      }),
      invalidatesTags: ["ChatGroups"],
    }),
    sendChatGroupMessage: builder.mutation<
      { message: any },
      {
        groupId: number;
        content?: string;
        contentType?: "text" | "image" | "video";
        mediaUrl?: string;
        replyToMessageId?: number;
        replyPreview?: string;
      }
    >({
      query: ({
        groupId,
        content,
        contentType,
        mediaUrl,
        replyToMessageId,
        replyPreview,
      }) => ({
        url: `/chat/groups/${groupId}/messages`,
        method: "POST",
        body: {
          content,
          contentType,
          mediaUrl,
          replyToMessageId,
          replyPreview,
        },
      }),
      invalidatesTags: ["ChatGroups"],
    }),
    toggleChatGroupMessageReaction: builder.mutation<
      {
        messageId: number;
        reactions: { emoji: string; count: number; userIds: number[] }[];
      },
      { groupId: number; messageId: number; emoji: string }
    >({
      query: ({ groupId, messageId, emoji }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}/reactions`,
        method: "PUT",
        body: { emoji },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetThreadsQuery,
  useGetMessagingInboxQuery,
  useGetMessagesQuery,
  useMarkThreadReadMutation,
  useDeleteThreadMutation,
  useSendMessageMutation,
  useToggleMessageReactionMutation,
  useDeleteMessageMutation,
  useDeleteGroupMessageMutation,
  useGetChatGroupsQuery,
  useCreateChatGroupMutation,
  useAddChatGroupMembersMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useMarkChatGroupReadMutation,
  useSendChatGroupMessageMutation,
  useToggleChatGroupMessageReactionMutation,
} = messagingApi;

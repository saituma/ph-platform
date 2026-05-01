import { apiRequest } from "@/lib/api";
import type {
  ChatMessagesResponse,
  ChatGroupsResponse,
  GroupMessagesResponse,
  GroupMembersResponse,
  InboxResponse,
  ApiChatMessage,
} from "@/types/chat-api";

type RequestBase = {
  token?: string | null;
  headers?: Record<string, string>;
  suppressStatusCodes?: number[];
};

export const messagesApi = {
  /** Load DM inbox threads. */
  listThreads(options: RequestBase) {
    return apiRequest<ChatMessagesResponse>("/messages", options);
  },

  /** Load a single DM conversation. */
  getThread(options: RequestBase & { forceRefresh?: boolean }) {
    return apiRequest<ChatMessagesResponse>("/messages", options);
  },

  /** Mark all DMs as read; pass peerUserId to scope to one thread. */
  markRead(options: RequestBase & { peerUserId?: number }) {
    const { peerUserId, ...rest } = options;
    return apiRequest("/messages/read", {
      ...rest,
      method: "POST",
      body:
        peerUserId && Number.isFinite(peerUserId) && peerUserId > 0
          ? { peerUserId }
          : undefined,
    });
  },

  /** Delete a DM message. */
  deleteMessage(messageId: number, options: RequestBase) {
    return apiRequest(`/messages/${messageId}`, { ...options, method: "DELETE" });
  },

  /** Toggle a reaction on a DM message (PUT). */
  reactToMessage(messageId: number, emoji: string, options: RequestBase) {
    return apiRequest(`/messages/${messageId}/reactions`, {
      ...options,
      method: "PUT",
      body: { emoji },
    });
  },

  /** Pin or unpin a DM message. */
  pinMessage(messageId: number | string, options: RequestBase) {
    return apiRequest(`/messages/${messageId}/pin`, { ...options, method: "PUT" });
  },

  /** Send a direct message. */
  send(body: Record<string, unknown>, options: RequestBase) {
    return apiRequest<{ message?: ApiChatMessage }>("/messages", {
      ...options,
      method: "POST",
      body,
    });
  },

  /** Forward a message. */
  forward(body: unknown, options: RequestBase) {
    return apiRequest("/messages/forward", { ...options, method: "POST", body });
  },

  inbox: {
    /** Unified inbox (threads + groups). */
    list(options: RequestBase & { forceRefresh?: boolean }) {
      return apiRequest<InboxResponse>("/inbox", options);
    },
  },

  groups: {
    /** List groups the acting user belongs to. */
    list(options: RequestBase) {
      return apiRequest<ChatGroupsResponse>("/chat/groups", options);
    },

    /** Load messages for a group. */
    getMessages(groupId: number, options: RequestBase) {
      return apiRequest<GroupMessagesResponse>(`/chat/groups/${groupId}/messages`, options);
    },

    /** Mark a group as read. */
    markRead(groupId: number, options: RequestBase) {
      return apiRequest(`/chat/groups/${groupId}/read`, { ...options, method: "POST" });
    },

    /** Delete a message from a group. */
    deleteMessage(groupId: number, messageId: number, options: RequestBase) {
      return apiRequest(`/chat/groups/${groupId}/messages/${messageId}`, {
        ...options,
        method: "DELETE",
      });
    },

    /** Toggle a reaction on a group message (PUT). */
    reactToMessage(groupId: number, messageId: number, emoji: string, options: RequestBase) {
      return apiRequest(`/chat/groups/${groupId}/messages/${messageId}/reactions`, {
        ...options,
        method: "PUT",
        body: { emoji },
      });
    },

    /** List members of a group. */
    getMembers(groupId: number, options: RequestBase) {
      return apiRequest<GroupMembersResponse>(`/chat/groups/${groupId}/members`, options);
    },

    /** Send a message to a group. */
    sendMessage(
      groupId: number,
      body: { content: string; contentType?: string },
      options: RequestBase,
    ) {
      return apiRequest<{ message?: ApiChatMessage }>(`/chat/groups/${groupId}/messages`, {
        ...options,
        method: "POST",
        body,
      });
    },
  },
};

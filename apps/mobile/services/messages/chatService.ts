import { apiRequest } from "@/lib/api";
import {
  InboxResponse,
  GroupMessagesResponse,
  GroupMembersResponse,
} from "@/types/chat-api";

export async function fetchInbox(token: string, actingHeaders?: Record<string, string>) {
  return apiRequest<InboxResponse>("/messages/inbox", {
    token,
    headers: actingHeaders,
    suppressStatusCodes: [401, 403],
  });
}

export async function fetchGroupDetails(token: string, groupId: number, actingHeaders?: Record<string, string>) {
  return Promise.all([
    apiRequest<GroupMessagesResponse>(`/chat/groups/${groupId}/messages`, {
      token,
      skipCache: true,
      forceRefresh: true,
      headers: actingHeaders,
    }),
    apiRequest<GroupMembersResponse>(`/chat/groups/${groupId}/members`, {
      token,
      skipCache: true,
      headers: actingHeaders,
    }),
  ]);
}

export async function fetchGroupMessages(token: string, groupId: number, actingHeaders?: Record<string, string>) {
  return apiRequest<GroupMessagesResponse>(`/chat/groups/${groupId}/messages`, {
    token,
    headers: actingHeaders,
  });
}

export async function fetchGroupMembers(token: string, groupId: number, actingHeaders?: Record<string, string>) {
  return apiRequest<GroupMembersResponse>(`/chat/groups/${groupId}/members`, {
    token,
    headers: actingHeaders,
  });
}

export async function sendDirectMessage(token: string, text: string, receiverId?: number, actingHeaders?: Record<string, string>) {
  return apiRequest("/messages", {
    method: "POST",
    token,
    headers: actingHeaders,
    body: {
      content: text.trim(),
      receiverId,
    },
  });
}

export async function sendGroupMessage(token: string, groupId: number, text: string, actingHeaders?: Record<string, string>) {
  return apiRequest(`/chat/groups/${groupId}/messages`, {
    method: "POST",
    token,
    headers: actingHeaders,
    body: { content: text.trim() },
  });
}

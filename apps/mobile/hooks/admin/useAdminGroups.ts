import { useCallback, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ChatGroup, GroupMessage, GroupMember, AdminUserResult } from "@/types/admin-messages";
import {
  getCachedAdminGroupMessages,
  setCachedAdminGroupMessages,
} from "@/lib/admin/adminMessageCache";
import { useAdminMutation } from "./useAdminQuery";
import { parseApiError } from "@/lib/errors";

export function useAdminGroups(token: string | null, canLoad: boolean) {
  const enabled = Boolean(token && canLoad);

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const inFlightLoadRef = useRef(false);

  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [activeGroupName, setActiveGroupName] = useState<string>("");
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const loadGroups = useCallback(
    async (query: string, forceRefresh: boolean) => {
      if (!enabled || inFlightLoadRef.current) return;
      inFlightLoadRef.current = true;
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const q = query.trim();
        const searchParams = new URLSearchParams();
        if (q) searchParams.set("q", q);
        searchParams.set("limit", "100");
        const res = await apiRequest<{ groups?: ChatGroup[] }>(
          `/chat/groups?${searchParams.toString()}`,
          { token: token!, skipCache: forceRefresh, forceRefresh, suppressStatusCodes: [401, 403] },
        );
        setGroups(Array.isArray(res?.groups) ? res.groups : []);
      } catch (e) {
        setGroupsError(parseApiError(e).message);
        setGroups([]);
      } finally {
        setGroupsLoading(false);
        inFlightLoadRef.current = false;
      }
    },
    [enabled, token],
  );

  const loadMessages = useCallback(
    async (groupId: number, forceRefresh: boolean) => {
      if (!enabled) return;
      const cached = getCachedAdminGroupMessages(groupId);
      if (cached) setMessages(cached);
      setMessagesLoading(!cached);
      setMessagesError(null);
      try {
        const res = await apiRequest<{ messages?: GroupMessage[] }>(
          `/chat/groups/${groupId}/messages?limit=100`,
          { token: token!, skipCache: forceRefresh, forceRefresh, suppressStatusCodes: [401, 403] },
        );
        const nextMessages = Array.isArray(res?.messages) ? [...res.messages].reverse() : [];
        setCachedAdminGroupMessages(groupId, nextMessages);
        setMessages(nextMessages);
      } catch (e) {
        setMessagesError(parseApiError(e).message);
      } finally {
        setMessagesLoading(false);
      }
    },
    [enabled, token],
  );

  const markGroupRead = useCallback(
    async (groupId: number) => {
      if (!enabled) return;
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, unreadCount: 0 } : g)));
      try {
        await apiRequest(`/chat/groups/${groupId}/read`, {
          method: "POST",
          token: token!,
          skipCache: true,
          suppressStatusCodes: [401, 403, 404],
        });
      } catch {
        // Non-fatal; badge re-syncs on next group fetch.
      }
    },
    [enabled, token],
  );

  const sendMutation = useAdminMutation<
    { groupId: number; content: string; mediaUrl?: string; contentType?: string },
    GroupMessage | undefined
  >(
    useCallback(
      async (params) => {
        if (!enabled) return;
        const res = await apiRequest<{ message?: GroupMessage }>(`/chat/groups/${params.groupId}/messages`, {
          method: "POST",
          token: token!,
          body: params,
          skipCache: true,
        });
        return res?.message;
      },
      [enabled, token],
    ),
  );

  const createMutation = useAdminMutation<
    { name: string; category: string; memberIds: number[] },
    ChatGroup | undefined
  >(
    useCallback(
      async (params) => {
        if (!enabled) return;
        const res = await apiRequest<{ group?: ChatGroup }>("/chat/groups", {
          method: "POST",
          token: token!,
          body: params,
          skipCache: true,
        });
        return res?.group;
      },
      [enabled, token],
    ),
  );

  const addMembersMutation = useAdminMutation<{ groupId: number; memberIds: number[] }>(
    useCallback(
      async ({ groupId, memberIds }) => {
        if (!enabled) return;
        await apiRequest(`/chat/groups/${groupId}/members`, {
          method: "POST",
          token: token!,
          body: { memberIds },
          skipCache: true,
        });
      },
      [enabled, token],
    ),
  );

  const removeMemberMutation = useAdminMutation<{ groupId: number; userId: number }>(
    useCallback(
      async ({ groupId, userId }) => {
        if (!enabled) return;
        await apiRequest(`/chat/groups/${groupId}/members/${userId}`, {
          method: "DELETE",
          token: token!,
          skipCache: true,
        });
      },
      [enabled, token],
    ),
  );

  const searchAdminUsers = useCallback(
    async (q: string) => {
      if (!enabled) return [] as AdminUserResult[];
      const searchParams = new URLSearchParams();
      const trimmed = q.trim();
      if (trimmed) searchParams.set("q", trimmed);
      searchParams.set("limit", "30");
      const res = await apiRequest<{ users?: AdminUserResult[] }>(
        `/admin/users?${searchParams.toString()}`,
        { token: token!, suppressStatusCodes: [403], skipCache: true },
      );
      return Array.isArray(res?.users) ? res.users : [];
    },
    [enabled, token],
  );

  const loadGroupMembers = useCallback(
    async (groupId: number) => {
      if (!enabled) return [] as GroupMember[];
      const res = await apiRequest<{ members?: GroupMember[] }>(
        `/chat/groups/${groupId}/members`,
        { token: token!, suppressStatusCodes: [401, 403], skipCache: true },
      );
      return Array.isArray(res?.members) ? res.members : [];
    },
    [enabled, token],
  );

  return {
    groups,
    groupsLoading,
    groupsError,
    activeGroupId,
    activeGroupName,
    messages,
    messagesLoading,
    messagesError,
    setActiveGroupId,
    setActiveGroupName,
    setMessages,
    loadGroups,
    loadMessages,
    markGroupRead,
    sendGroupMessage: (params: { groupId: number; content: string; mediaUrl?: string; contentType?: string }) =>
      sendMutation.run(params),
    createGroup: (params: { name: string; category: string; memberIds: number[] }) => createMutation.run(params),
    addMembers: (groupId: number, memberIds: number[]) => addMembersMutation.run({ groupId, memberIds }),
    removeMember: (groupId: number, userId: number) => removeMemberMutation.run({ groupId, userId }),
    searchAdminUsers,
    loadGroupMembers,
  };
}

import { useCallback, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ChatGroup, GroupMessage, GroupMember, AdminUserResult } from "@/types/admin-messages";
import {
  getCachedAdminGroupMessages,
  setCachedAdminGroupMessages,
} from "@/lib/admin/adminMessageCache";

export function useAdminGroups(token: string | null, canLoad: boolean) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  // Single-flight: drops overlapping loadGroups calls so that quick query typing,
  // tab switches, and refreshes don't pile up parallel API requests.
  const inFlightLoadRef = useRef(false);

  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [activeGroupName, setActiveGroupName] = useState<string>("");
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const loadGroups = useCallback(
    async (query: string, forceRefresh: boolean) => {
      if (!token || !canLoad) return;
      if (inFlightLoadRef.current) return;
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
          {
            token,
            skipCache: forceRefresh,
            forceRefresh,
            suppressStatusCodes: [401, 403],
          },
        );
        setGroups(Array.isArray(res?.groups) ? res.groups : []);
      } catch (e) {
        setGroupsError(e instanceof Error ? e.message : "Failed to load groups");
        setGroups([]);
      } finally {
        setGroupsLoading(false);
        inFlightLoadRef.current = false;
      }
    },
    [canLoad, token],
  );

  const loadMessages = useCallback(async (groupId: number, forceRefresh: boolean) => {
    if (!token || !canLoad) return;
    const cached = getCachedAdminGroupMessages(groupId);
    if (cached) {
      setMessages(cached);
    }
    setMessagesLoading(!cached);
    setMessagesError(null);
    try {
      const res = await apiRequest<{ messages?: GroupMessage[] }>(
        `/chat/groups/${groupId}/messages?limit=100`,
        {
          token,
          skipCache: forceRefresh,
          forceRefresh,
          suppressStatusCodes: [401, 403],
        }
      );
      const nextMessages = Array.isArray(res?.messages)
        ? [...res.messages].reverse()
        : [];
      setCachedAdminGroupMessages(groupId, nextMessages);
      setMessages(nextMessages);
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : "Failed to load group messages");
    } finally {
      setMessagesLoading(false);
    }
  }, [canLoad, token]);

  const markGroupRead = useCallback(
    async (groupId: number) => {
      if (!token || !canLoad) return;
      // Optimistic local update so the badge clears immediately.
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, unreadCount: 0 } : g)),
      );
      try {
        await apiRequest(`/chat/groups/${groupId}/read`, {
          method: "POST",
          token,
          skipCache: true,
          suppressStatusCodes: [401, 403, 404],
        });
      } catch {
        // Server failure is non-fatal; the badge will re-sync on next group fetch.
      }
    },
    [canLoad, token],
  );

  const sendGroupMessage = useCallback(async (params: {
    groupId: number;
    content: string;
    mediaUrl?: string;
    contentType?: string;
  }) => {
    if (!token || !canLoad) return;
    const res = await apiRequest<{ message?: GroupMessage }>(`/chat/groups/${params.groupId}/messages`, {
      method: "POST",
      token,
      body: params,
      skipCache: true,
    });
    return res?.message;
  }, [canLoad, token]);

  const createGroup = useCallback(async (params: {
    name: string;
    category: string;
    memberIds: number[];
  }) => {
    if (!token || !canLoad) return;
    const res = await apiRequest<{ group?: ChatGroup }>("/chat/groups", {
      method: "POST",
      token,
      body: params,
      skipCache: true,
    });
    return res?.group;
  }, [canLoad, token]);

  const addMembers = useCallback(async (groupId: number, memberIds: number[]) => {
    if (!token || !canLoad) return;
    await apiRequest(`/chat/groups/${groupId}/members`, {
      method: "POST",
      token,
      body: { memberIds },
      skipCache: true,
    });
  }, [canLoad, token]);

  const removeMember = useCallback(async (groupId: number, userId: number) => {
    if (!token || !canLoad) return;
    await apiRequest(`/chat/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
      token,
      skipCache: true,
    });
  }, [canLoad, token]);

  const searchAdminUsers = useCallback(async (q: string) => {
    if (!token || !canLoad) return [] as AdminUserResult[];
    const searchParams = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) searchParams.set("q", trimmed);
    searchParams.set("limit", "30");
    const res = await apiRequest<{ users?: AdminUserResult[] }>(
      `/admin/users?${searchParams.toString()}`,
      {
        token,
        suppressStatusCodes: [403],
        skipCache: true,
      },
    );
    return Array.isArray(res?.users) ? res.users : [];
  }, [canLoad, token]);

  const loadGroupMembers = useCallback(async (groupId: number) => {
    if (!token || !canLoad) return [] as GroupMember[];
    const res = await apiRequest<{ members?: GroupMember[] }>(
      `/chat/groups/${groupId}/members`,
      {
        token,
        suppressStatusCodes: [401, 403],
        skipCache: true,
      },
    );
    return Array.isArray(res?.members) ? res.members : [];
  }, [canLoad, token]);

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
    sendGroupMessage,
    createGroup,
    addMembers,
    removeMember,
    searchAdminUsers,
    loadGroupMembers,
  };
}

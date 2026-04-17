import { useCallback } from "react";
import { useRouter } from "expo-router";
import { Socket } from "socket.io-client";
import { ChatMessage } from "@/constants/messages";
import { MessageThread } from "@/types/messages";
import { apiRequest } from "@/lib/api";
import { parseReplyPrefix } from "@/lib/messages/reply";
import { hasPaidProgramTier } from "@/lib/planAccess";
import * as chatService from "@/services/messages/chatService";
import {
  classifyGroupThread,
  mapGroupToThread,
  mapCoachToThread,
} from "@/lib/messages/mappers/threadMapper";
import {
  mapApiDirectMessageToChatMessage,
  mapApiGroupMessageToChatMessage,
} from "@/lib/messages/mappers/messageMapper";
import { ApiChatMessage } from "@/types/chat-api";

interface ChatActionsParams {
  token: string | null;
  actingHeaders: Record<string, string> | undefined;
  actingUserId: number | null;
  effectiveProfileId: number;
  effectiveProfileName: string;
  profileName: string | null;
  programTier: string | null;
  socket: Socket | null;
  setThreads: React.Dispatch<React.SetStateAction<MessageThread[]>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsThreadLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setGroupMembers: React.Dispatch<React.SetStateAction<Record<number, Record<number, { name: string; avatar?: string | null }>>>>;
}

export function useChatActions({
  token,
  actingHeaders,
  actingUserId,
  effectiveProfileId,
  effectiveProfileName,
  profileName,
  programTier,
  socket,
  setThreads,
  setMessages,
  setIsLoading,
  setIsThreadLoading,
  setGroupMembers,
}: ChatActionsParams) {
  const router = useRouter();

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const silent = options?.silent ?? false;
      if (!silent) setIsLoading(true);

      try {
        const [messagesResult, groupsResult] = await chatService.fetchInbox(
          token,
          actingHeaders,
        );

        const data =
          messagesResult.status === "fulfilled"
            ? messagesResult.value
            : { messages: [], coaches: [] };

        const groupsData =
          groupsResult.status === "fulfilled"
            ? groupsResult.value
            : { groups: [] };

        const groupThreads = (groupsData.groups ?? [])
          .filter((group) => classifyGroupThread(group) !== "announcement")
          .map(mapGroupToThread);

        const selfId = String(effectiveProfileId ?? "");
        const isPremium = hasPaidProgramTier(programTier);
        const coaches = data.coaches ?? (data.coach ? [data.coach] : []);

        const coachThreads = coaches
          .filter((c) => !c.isAi)
          .map((c) => mapCoachToThread(c, data.messages ?? [], isPremium));

        const mappedMessages = (data.messages ?? []).map((msg) =>
          mapApiDirectMessageToChatMessage(msg, selfId, coaches, profileName),
        );

        const sortedThreads = [...coachThreads, ...groupThreads].sort(
          (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0),
        );
        setThreads(sortedThreads);
        setMessages((prev) => {
          const groupMessages = prev.filter((m) =>
            String(m.threadId ?? "").startsWith("group:"),
          );
          const seen = new Set<string>();
          const next: ChatMessage[] = [];
          for (const msg of [...groupMessages, ...mappedMessages]) {
            if (!msg?.id) continue;
            if (seen.has(msg.id)) continue;
            seen.add(msg.id);
            next.push(msg);
          }
          return next;
        });
      } catch (error) {
        console.warn("Failed to load messages", error);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [actingHeaders, effectiveProfileId, profileName, programTier, token, setIsLoading, setThreads, setMessages],
  );

  const loadGroupMessages = useCallback(
    async (groupId: number, options?: { silent?: boolean }) => {
      if (!token) return;
      const silent = options?.silent ?? false;
      if (!silent) setIsThreadLoading(true);

      try {
        const [data, membersData] = await chatService.fetchGroupDetails(
          token,
          groupId,
          actingHeaders,
        );

        const memberMap = membersData.members.reduce<
          Record<number, { name: string; avatar?: string | null }>
        >((acc, member) => {
          acc[member.userId] = {
            name: member.name || member.email,
            avatar: member.profilePicture ?? null,
          };
          return acc;
        }, {});
        setGroupMembers((prev) => ({ ...prev, [groupId]: memberMap }));

        const selfId = String(effectiveProfileId ?? "");
        const mappedMessages = (data.messages ?? []).map((msg) =>
          mapApiGroupMessageToChatMessage(msg, groupId, selfId, memberMap),
        );

        setMessages((prev) => {
          const threadKey = `group:${groupId}`;
          const remaining = prev.filter((msg) => msg.threadId !== threadKey);
          const optimistic = prev.filter(
            (msg) =>
              msg.threadId === threadKey &&
              typeof msg.id === "string" &&
              msg.id.startsWith("client-"),
          );

          const seen = new Set<string>();
          const next: ChatMessage[] = [];
          for (const msg of [...remaining, ...optimistic, ...mappedMessages]) {
            if (!msg?.id) continue;
            if (seen.has(msg.id)) continue;
            seen.add(msg.id);
            next.push(msg);
          }
          return next;
        });

        if (mappedMessages.length > 0) {
          const lastMsg = mappedMessages[mappedMessages.length - 1];
          setThreads((prev) =>
            prev.map((t) =>
              t.id === `group:${groupId}`
                ? {
                    ...t,
                    preview: lastMsg.text,
                    time: lastMsg.time,
                    updatedAtMs: Date.now(),
                  }
                : t,
            ),
          );
        }
      } catch (error) {
        console.warn("Failed to load group messages", error);
      } finally {
        if (!silent) setIsThreadLoading(false);
      }
    },
    [actingHeaders, effectiveProfileId, token, setIsThreadLoading, setGroupMembers, setMessages, setThreads],
  );

  const sendReplyToThread = useCallback(
    async (threadId: string, text: string) => {
      if (!token || !text.trim()) return;
      if (threadId.startsWith("group:")) {
        const groupId = Number(threadId.replace("group:", ""));
        if (!Number.isFinite(groupId)) return;
        await chatService.sendGroupMessage(token, groupId, text, actingHeaders);
        await loadGroupMessages(groupId, { silent: true });
      } else {
        const receiverId = isNaN(Number(threadId)) ? undefined : Number(threadId);
        await chatService.sendDirectMessage(token, text, receiverId, actingHeaders);
        await loadMessages({ silent: true });
      }
    },
    [actingHeaders, loadGroupMessages, loadMessages, token],
  );

  const markDirectThreadReadById = useCallback(
    async (id: string) => {
      if (!token) return;
      if (id.startsWith("group:")) return;
      try {
        await apiRequest("/messages/read", {
          method: "POST",
          token,
          headers: actingHeaders,
        });
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.threadId === id && msg.from === "coach"
              ? { ...msg, status: "read" }
              : msg,
          ),
        );
      } catch (error) {
        console.warn("Failed to mark messages read", error);
      }
    },
    [actingHeaders, token, setThreads, setMessages],
  );

  const markGroupThreadRead = useCallback(
    async (id: string) => {
      if (!token) return;
      if (!id.startsWith("group:")) return;
      const raw = id.replace(/^group:/, "");
      const groupId = Number(raw);
      if (!Number.isFinite(groupId)) return;
      try {
        await apiRequest(`/chat/groups/${groupId}/read`, {
          method: "POST",
          token,
          headers: actingHeaders,
        });
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
        );
      } catch (error) {
        console.warn("Failed to mark group read", error);
      }
    },
    [actingHeaders, token, setThreads],
  );

  const handleDeleteMessage = useCallback(
    async (message: ChatMessage) => {
      if (!token) return;
      try {
        if (message.threadId.startsWith("group:")) {
          const groupId = Number(message.threadId.replace("group:", ""));
          const messageId = Number(message.id.replace("group-", ""));
          if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) return;
          await apiRequest(`/chat/groups/${groupId}/messages/${messageId}`, {
            method: "DELETE",
            token,
            headers: actingHeaders,
          });
        } else {
          const messageId = Number(message.id);
          if (!Number.isFinite(messageId)) return;
          await apiRequest(`/messages/${messageId}`, {
            method: "DELETE",
            token,
            headers: actingHeaders,
          });
        }
        setMessages((prev) => prev.filter((item) => item.id !== message.id));
      } catch (error) {
        console.warn("Failed to delete message", error);
      }
    },
    [actingHeaders, token, setMessages],
  );

  const handleToggleReaction = useCallback(
    async (message: ChatMessage, emoji: string) => {
      if (!token) return;
      try {
        const currentUserId = Number.isFinite(effectiveProfileId)
          ? effectiveProfileId
          : 0;
        const existingEmoji =
          currentUserId > 0
            ? message.reactions?.find((reaction) =>
                reaction.userIds?.includes(currentUserId),
              )?.emoji
            : undefined;

        const toggleReaction = async (nextEmoji: string) => {
          if (message.threadId.startsWith("group:")) {
            const groupId = Number(message.threadId.replace("group:", ""));
            const messageId = Number(message.id.replace("group-", ""));
            if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) return;
            await apiRequest(
              `/chat/groups/${groupId}/messages/${messageId}/reactions`,
              {
                method: "PUT",
                token,
                headers: actingHeaders,
                body: { emoji: nextEmoji },
              },
            );
            return;
          }
          const messageId = Number(message.id);
          if (!Number.isFinite(messageId)) return;
          await apiRequest(`/messages/${messageId}/reactions`, {
            method: "PUT",
            token,
            headers: actingHeaders,
            body: { emoji: nextEmoji },
          });
        };

        if (existingEmoji && existingEmoji !== emoji) {
          await toggleReaction(existingEmoji);
        }
        await toggleReaction(emoji);
      } catch (error) {
        console.warn("Failed to react to message", error);
      }
    },
    [actingHeaders, effectiveProfileId, token],
  );

  return {
    loadMessages,
    loadGroupMessages,
    sendReplyToThread,
    markDirectThreadReadById,
    markGroupThreadRead,
    handleDeleteMessage,
    handleToggleReaction,
  };
}

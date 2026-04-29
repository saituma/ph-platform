import { useCallback, useRef } from "react";
import { Socket } from "socket.io-client";

function formatLastSeenStatic(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Last seen yesterday";
  return `Last seen ${days}d ago`;
}

import { ChatMessage } from "@/constants/messages";
import { MessageThread } from "@/types/messages";
import { apiRequest } from "@/lib/api";
import { hasPaidProgramTier } from "@/lib/planAccess";
import * as chatService from "@/services/messages/chatService";
import {
  classifyGroupThread,
  mapCoachToThread,
} from "@/lib/messages/mappers/threadMapper";
import {
  mapApiDirectMessageToChatMessage,
  mapApiGroupMessageToChatMessage,
} from "@/lib/messages/mappers/messageMapper";
import { schedulePrefetchChatMessageMedia } from "@/lib/messages/prefetchChatMedia";
import { ApiChatMessage, ChatMessagesResponse } from "@/types/chat-api";

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
  // Track IDs of messages pending deletion so background reloads don't re-add them
  const pendingDeleteIds = useRef<Set<string>>(new Set());
  // Single-flight: drop overlapping loadMessages calls. Fixes the storm of
  // back-to-back /messages requests when the hook deps churn (logs showed 14+
  // calls in seconds — every one is a full /messages + /inbox round-trip).
  const inFlightLoadRef = useRef(false);

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      if (inFlightLoadRef.current) {
        console.log("[DEBUG-msg] loadMessages: skipped (already in flight)");
        return;
      }
      inFlightLoadRef.current = true;
      const silent = options?.silent ?? false;
      if (!silent) setIsLoading(true);

      try {
        const [inboxData, data] = await Promise.all([
          chatService.fetchInbox(token, actingHeaders),
          apiRequest<ChatMessagesResponse>("/messages", {
            token,
            headers: actingHeaders,
            suppressStatusCodes: [401, 403],
          }),
        ]);

        const selfId = String(effectiveProfileId ?? "");
        const isPremium = hasPaidProgramTier(programTier);
        const coaches = data.coaches ?? (data.coach ? [data.coach] : []);
        const inboxThreads = (inboxData.threads ?? [])
          .filter((thread) => {
            if (thread.type !== "group") return true;
            const category = classifyGroupThread({
              id: Number(thread.groupId ?? 0),
              name: thread.name,
              category: thread.groupCategory ?? undefined,
              createdAt: thread.updatedAt,
            });
            return category !== "announcement";
          })
          .map((thread): MessageThread => {
            const updatedAtMs = new Date(thread.updatedAt ?? 0).getTime();
            const time = Number.isFinite(updatedAtMs)
              ? new Date(updatedAtMs).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            if (thread.type === "group") {
              const category = classifyGroupThread({
                id: Number(thread.groupId ?? 0),
                name: thread.name,
                category: thread.groupCategory ?? undefined,
                createdAt: thread.updatedAt,
              });
              return {
                id:
                  thread.id ||
                  `group:${String(thread.groupId ?? "").trim()}`,
                name: thread.name,
                role: category === "team" ? "Team" : "Group",
                channelType: category,
                groupLabel: category === "team" ? "Team inbox" : "Coach group",
                preview: thread.preview,
                senderName:
                  String(thread.lastMessageSenderName ?? "").trim() || undefined,
                time,
                pinned: false,
                premium: false,
                unread: Number(thread.unread ?? 0) || 0,
                lastSeen: "Active",
                responseTime: "Group updates",
                updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
                avatarUrl: thread.avatarUrl ?? null,
              };
            }
            const directId =
              Number(thread.peerUserId) > 0
                ? String(thread.peerUserId)
                : String(thread.id ?? "").replace(/^direct:/, "");
            return {
              id: directId,
              name: thread.name,
              role: thread.role ?? "Coach",
              channelType: "direct",
              groupLabel: "Direct message",
              preview: thread.preview,
              time,
              pinned: false,
              premium: isPremium,
              unread: Number(thread.unread ?? 0) || 0,
              lastSeen: thread.lastSeenAt ? formatLastSeenStatic(thread.lastSeenAt) : "Active",
              responseTime: isPremium
                ? "Priority response window"
                : "Standard response window",
              updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
              avatarUrl: thread.avatarUrl ?? null,
              isAi: false,
              lastSeenAt: thread.lastSeenAt ?? null,
            };
          });

        const orderedDirectMessages = [...(data.messages ?? [])].sort(
          (a, b) => Number(a.id ?? 0) - Number(b.id ?? 0),
        );
        const mappedMessages = orderedDirectMessages.map((msg) =>
          mapApiDirectMessageToChatMessage(msg, selfId, coaches, profileName),
        );

        // Surface every coach available to this user as a tappable thread, even if
        // there's no message history yet. Otherwise team managers / athletes whose
        // coach hasn't messaged them first have no way to start a chat. Skip any
        // coach that already has an inbox thread (that one has live unread/preview).
        const inboxThreadIds = new Set(inboxThreads.map((t) => t.id));
        const coachThreads = (coaches ?? [])
          .filter((coach) => coach?.id != null && !inboxThreadIds.has(String(coach.id)))
          .map((coach) =>
            mapCoachToThread(coach, orderedDirectMessages, isPremium),
          );

        const sortedThreads = [...inboxThreads, ...coachThreads].sort(
          (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0),
        );
        // Preserve real-time "Online" status that presence:update wrote before this
        // fetch completed — a full array replace would wipe it.
        setThreads((prev) => {
          const onlineIds = new Set(
            prev.filter((t) => t.lastSeen === "Online").map((t) => t.id),
          );
          return sortedThreads.map((t) =>
            onlineIds.has(t.id) ? { ...t, lastSeen: "Online" } : t,
          );
        });
        const deletedIds = pendingDeleteIds.current;
        setMessages((prev) => {
          const groupMessages = prev.filter((m) =>
            String(m.threadId ?? "").startsWith("group:") && !deletedIds.has(m.id),
          );
          const optimisticDirect = prev.filter(
            (m) =>
              !String(m.threadId ?? "").startsWith("group:") &&
              typeof m.id === "string" &&
              m.id.startsWith("client-"),
          );
          // Preserve confirmed direct messages already in state that may not be
          // in the server response yet (race: sent just before this fetch fired).
          const confirmedDirect = prev.filter(
            (m) =>
              !String(m.threadId ?? "").startsWith("group:") &&
              !(typeof m.id === "string" && m.id.startsWith("client-")) &&
              !deletedIds.has(m.id),
          );
          const seen = new Set<string>();
          const next: ChatMessage[] = [];
          for (const msg of [
            ...groupMessages,
            ...mappedMessages.filter((m) => !deletedIds.has(m.id)),
            ...confirmedDirect,
            ...optimisticDirect,
          ]) {
            if (!msg?.id) continue;
            if (seen.has(String(msg.id))) continue;
            seen.add(String(msg.id));
            next.push(msg);
          }
          console.log(
            "[DEBUG-msg] loadMessages reconcile:",
            "prev=", prev.length,
            "mappedFromServer=", mappedMessages.length,
            "preservedConfirmed=", confirmedDirect.length,
            "preservedOptimistic=", optimisticDirect.length,
            "preservedGroup=", groupMessages.length,
            "next=", next.length,
          );
          return next;
        });
        schedulePrefetchChatMessageMedia(mappedMessages);

        const topGroupIds = sortedThreads
          .filter((thread) => String(thread.id).startsWith("group:"))
          .slice(0, 3)
          .map((thread) => Number(String(thread.id).replace("group:", "")))
          .filter((id) => Number.isFinite(id) && id > 0);
        for (const groupId of topGroupIds) {
          void chatService
            .fetchGroupMessages(token, groupId, actingHeaders)
            .then((groupData) => {
              const mappedGroupMessages = (groupData.messages ?? [])
                .slice()
                .sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0))
                .map((msg) =>
                  mapApiGroupMessageToChatMessage(
                    msg,
                    groupId,
                    selfId,
                    {},
                  ),
                );
              if (!mappedGroupMessages.length) return;
              setMessages((prev) => {
                const threadKey = `group:${groupId}`;
                const nonGroup = prev.filter((m) => m.threadId !== threadKey);
                const optimistic = prev.filter(
                  (m) =>
                    m.threadId === threadKey &&
                    typeof m.id === "string" &&
                    m.id.startsWith("client-"),
                );
                // Preserve confirmed group messages from prev state — protects
                // against just-sent messages disappearing when the server hasn't
                // indexed them yet by the time this prefetch fires.
                const confirmedInGroup = prev.filter(
                  (m) =>
                    m.threadId === threadKey &&
                    !(typeof m.id === "string" && m.id.startsWith("client-")) &&
                    !pendingDeleteIds.current.has(m.id),
                );
                const seen = new Set<string>();
                const next: ChatMessage[] = [];
                for (const msg of [
                  ...nonGroup,
                  ...mappedGroupMessages,
                  ...confirmedInGroup,
                  ...optimistic,
                ]) {
                  if (!msg?.id || seen.has(msg.id)) continue;
                  seen.add(msg.id);
                  next.push(msg);
                }
                return next;
              });
              schedulePrefetchChatMessageMedia(mappedGroupMessages);
            })
            .catch(() => {
              // Silent prefetch failure should not affect UX.
            });
        }
      } catch (error) {
        console.warn("Failed to load messages", error);
      } finally {
        if (!silent) setIsLoading(false);
        inFlightLoadRef.current = false;
      }
    },
    [actingHeaders, effectiveProfileId, profileName, programTier, token, setIsLoading, setThreads, setMessages],
  );

  // Single-flight per groupId so a flurry of group-message loads doesn't pile up.
  const inFlightGroupLoadRef = useRef<Set<number>>(new Set());

  const loadGroupMessages = useCallback(
    async (groupId: number, options?: { silent?: boolean }) => {
      if (!token) return;
      if (inFlightGroupLoadRef.current.has(groupId)) {
        console.log("[DEBUG-msg] loadGroupMessages: skipped (in flight)", groupId);
        return;
      }
      inFlightGroupLoadRef.current.add(groupId);
      const silent = options?.silent ?? false;
      if (!silent) setIsThreadLoading(true);

      try {
        // Load messages first so thread content appears immediately.
        const data = await chatService.fetchGroupMessages(
          token,
          groupId,
          actingHeaders,
        );
        const existingMemberMap: Record<
          number,
          { name: string; avatar?: string | null }
        > = {};

        const selfId = String(effectiveProfileId ?? "");
        const orderedGroupMessages = [...(data.messages ?? [])].sort(
          (a, b) => Number(a.id ?? 0) - Number(b.id ?? 0),
        );
        const mappedMessages = orderedGroupMessages.map((msg) =>
          mapApiGroupMessageToChatMessage(msg, groupId, selfId, existingMemberMap),
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
          // Preserve confirmed group messages already in state that may not be
          // in the server response yet (race: a just-sent message gets confirmed
          // by the API but the next /messages fetch happens before the server
          // has indexed it — without this, sent group messages would disappear).
          const confirmedInGroup = prev.filter(
            (msg) =>
              msg.threadId === threadKey &&
              !(typeof msg.id === "string" && msg.id.startsWith("client-")) &&
              !pendingDeleteIds.current.has(msg.id),
          );

          const dIds = pendingDeleteIds.current;
          const seen = new Set<string>();
          const next: ChatMessage[] = [];
          // Order matters: mappedMessages first → server version wins on duplicate id
          // (so server-side edits/reactions take precedence over our local copy).
          for (const msg of [
            ...remaining.filter((m) => !dIds.has(m.id)),
            ...mappedMessages.filter((m) => !dIds.has(m.id)),
            ...confirmedInGroup,
            ...optimistic,
          ]) {
            if (!msg?.id) continue;
            if (seen.has(msg.id)) continue;
            seen.add(msg.id);
            next.push(msg);
          }
          return next;
        });
        schedulePrefetchChatMessageMedia(mappedMessages);

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

        // Member metadata can arrive after messages; update author names/avatars in place.
        void chatService
          .fetchGroupMembers(token, groupId, actingHeaders)
          .then((membersData) => {
            const memberMap = membersData.members.reduce<
              Record<number, { name: string; avatar?: string | null }>
            >((acc, member) => {
              const displayName =
                String(member.displayName ?? "").trim() ||
                String(member.name ?? "").trim() ||
                String(member.email ?? "").trim();
              acc[member.userId] = {
                name: displayName || `User ${member.userId}`,
                avatar: member.profilePicture ?? null,
              };
              return acc;
            }, {});
            setGroupMembers((prev) => ({ ...prev, [groupId]: memberMap }));
            setMessages((prev) =>
              prev.map((message) => {
                if (message.threadId !== `group:${groupId}`) return message;
                const senderId = Number(message.senderId ?? NaN);
                if (!Number.isFinite(senderId)) return message;
                const member = memberMap[senderId];
                if (!member) return message;
                return {
                  ...message,
                  authorName: message.authorName || member.name,
                  authorAvatar: message.authorAvatar ?? member.avatar ?? null,
                };
              }),
            );
          })
          .catch((error) => {
            console.warn("Failed to load group members", error);
          });
      } catch (error) {
        console.warn("Failed to load group messages", error);
      } finally {
        if (!silent) setIsThreadLoading(false);
        inFlightGroupLoadRef.current.delete(groupId);
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
        const peerUserId = Number(id);
        await apiRequest("/messages/read", {
          method: "POST",
          token,
          headers: actingHeaders,
          body: Number.isFinite(peerUserId) && peerUserId > 0
            ? { peerUserId }
            : undefined,
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
      // Mark as pending delete immediately so background reloads skip it
      pendingDeleteIds.current.add(message.id);
      let removedMessage: ChatMessage | null = null;
      let removedIndex = -1;
      setMessages((prev) => {
        removedIndex = prev.findIndex((item) => item.id === message.id);
        removedMessage =
          removedIndex >= 0 && removedIndex < prev.length
            ? prev[removedIndex]
            : null;
        if (removedIndex < 0) return prev;
        return prev.filter((item) => item.id !== message.id);
      });
      try {
        if (message.threadId.startsWith("group:")) {
          const groupId = Number(message.threadId.replace("group:", ""));
          const messageId = Number(message.id.replace("group-", ""));
          if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
            pendingDeleteIds.current.delete(message.id);
            return;
          }
          await apiRequest(`/chat/groups/${groupId}/messages/${messageId}`, {
            method: "DELETE",
            token,
            headers: actingHeaders,
          });
        } else {
          const messageId = Number(message.id);
          if (!Number.isFinite(messageId)) {
            pendingDeleteIds.current.delete(message.id);
            return;
          }
          await apiRequest(`/messages/${messageId}`, {
            method: "DELETE",
            token,
            headers: actingHeaders,
          });
        }
        // Keep in set permanently — message is gone from server too
      } catch (error) {
        // Delete failed — remove from pending set and restore message
        pendingDeleteIds.current.delete(message.id);
        if (removedMessage) {
          setMessages((prev) => {
            if (prev.some((item) => item.id === removedMessage?.id)) return prev;
            if (removedIndex < 0 || removedIndex > prev.length) {
              return [...prev, removedMessage as ChatMessage];
            }
            const next = [...prev];
            next.splice(removedIndex, 0, removedMessage as ChatMessage);
            return next;
          });
        }
        console.warn("Failed to delete message", error);
      }
    },
    [actingHeaders, token, setMessages],
  );

  const handleToggleReaction = useCallback(
    async (message: ChatMessage, emoji: string) => {
      if (!token) return;
      const currentUserId = Number.isFinite(effectiveProfileId)
        ? effectiveProfileId
        : 0;
      if (currentUserId <= 0) return;
      const previousReactions = message.reactions ?? [];
      const applyOptimisticReaction = (
        reactions: { emoji: string; count: number; userIds: number[] }[],
      ) => {
        const next = (reactions ?? []).map((reaction) => ({
          ...reaction,
          userIds: [...(reaction.userIds ?? [])],
        }));
        const existingReactionIndex = next.findIndex((reaction) =>
          reaction.userIds.includes(currentUserId),
        );
        const existingEmoji =
          existingReactionIndex >= 0 ? next[existingReactionIndex].emoji : null;

        // Tapping the same emoji toggles it off.
        if (existingEmoji === emoji) {
          const reaction = next[existingReactionIndex];
          reaction.userIds = reaction.userIds.filter((id) => id !== currentUserId);
          reaction.count = reaction.userIds.length;
          return next.filter((item) => item.count > 0);
        }

        // Remove current user from any previous reaction.
        if (existingReactionIndex >= 0) {
          const previous = next[existingReactionIndex];
          previous.userIds = previous.userIds.filter((id) => id !== currentUserId);
          previous.count = previous.userIds.length;
        }

        // Add current user to selected emoji.
        const targetIndex = next.findIndex((reaction) => reaction.emoji === emoji);
        if (targetIndex >= 0) {
          const target = next[targetIndex];
          if (!target.userIds.includes(currentUserId)) {
            target.userIds.push(currentUserId);
          }
          target.count = target.userIds.length;
        } else {
          next.push({ emoji, count: 1, userIds: [currentUserId] });
        }
        return next.filter((item) => item.count > 0);
      };

      const optimisticReactions = applyOptimisticReaction(previousReactions);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, reactions: optimisticReactions } : item,
        ),
      );

      try {
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
              body: { emoji },
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
          body: { emoji },
        });
      } catch (error) {
        // Roll back optimistic update if request fails.
        setMessages((prev) =>
          prev.map((item) =>
            item.id === message.id ? { ...item, reactions: previousReactions } : item,
          ),
        );
        console.warn("Failed to react to message", error);
      }
    },
    [actingHeaders, effectiveProfileId, token, setMessages],
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

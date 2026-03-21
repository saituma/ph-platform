"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { io, Socket } from "socket.io-client";
import { useSound } from "@/hooks/use-sound";
import { notificationPopSound } from "@/lib/notification-pop";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { InboxList } from "../../components/admin/messaging/inbox-list";
import { GroupInboxPanel } from "../../components/admin/messaging/group-inbox-panel";
import { MessagingConversationCard } from "../../components/admin/messaging/messaging-conversation-card";
import type { ComposerAttachment } from "../../components/admin/messaging/conversation-panel";
import { MessageDialogs, type MessagingDialog } from "../../components/admin/messaging/message-dialogs";
import {
  useCreateChatGroupMutation,
  useCreateMediaUploadUrlMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useGetChatGroupsQuery,
  useGetMessagesQuery,
  useMarkThreadReadMutation,
  useGetThreadsQuery,
  useGetUsersQuery,
  useGetAdminProfileQuery,
  useUpdateMessagingAccessMutation,
  useSendChatGroupMessageMutation,
  useSendMessageMutation,
  useToggleChatGroupMessageReactionMutation,
  useToggleMessageReactionMutation,
  useDeleteMessageMutation,
  useDeleteGroupMessageMutation,
  useDeleteThreadMutation,
} from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type ThreadItem = {
  userId: number;
  name: string;
  displayName?: string;
  preview: string;
  time: string;
  priority: boolean;
  premium: boolean;
  unread?: number;
  pinned?: boolean;
  lastTimestamp?: number;
  role?: string;
  hasAthlete?: boolean;
  athleteName?: string | null;
  programTier?: string | null;
  typing?: boolean;
  avatarUrl?: string | null;
};

type MessageItem = {
  id: string;
  author: string;
  time: string;
  text: string;
  mediaUrl?: string | null;
  contentType?: "text" | "image" | "video";
  reactions?: { emoji: string; count: number; reactedByMe?: boolean }[];
  status?: "sent" | "delivered" | "read";
};

export default function MessagingPage() {
  const [playNotificationSound] = useSound(notificationPopSound);
  const [activeDialog, setActiveDialog] = useState<MessagingDialog>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [inboxMode, setInboxMode] = useState<"direct" | "group">("direct");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, { name: string; isTyping: boolean }>>({});
  const [mobileView, setMobileView] = useState<"inbox" | "conversation">("inbox");
  const [realtimeDirectMessages, setRealtimeDirectMessages] = useState<MessageItem[]>([]);
  const [realtimeGroupMessages, setRealtimeGroupMessages] = useState<MessageItem[]>([]);
  const [uploadState, setUploadState] = useState<{ name: string; sizeLabel: string; progress: number } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: groupsData, refetch: refetchGroups } = useGetChatGroupsQuery();
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateChatGroupMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [sendGroupMessage, { isLoading: isSendingGroup }] = useSendChatGroupMessageMutation();
  const [toggleMessageReaction] = useToggleMessageReactionMutation();
  const [toggleGroupMessageReaction] = useToggleChatGroupMessageReactionMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [deleteGroupMessage] = useDeleteGroupMessageMutation();
  const [deleteThread] = useDeleteThreadMutation();
  const [markThreadRead] = useMarkThreadReadMutation();
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const lastNotifiedRef = useRef<number | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const { data: adminProfile } = useGetAdminProfileQuery();
  const [updateMessagingAccess, { isLoading: savingMessagingAccess }] = useUpdateMessagingAccessMutation();
  const [localMessagingTiers, setLocalMessagingTiers] = useState<string[]>(["PHP", "PHP_Plus", "PHP_Premium"]);

  useEffect(() => {
    const raw = adminProfile?.settings?.messagingEnabledTiers;
    if (raw === undefined || raw === null) {
      setLocalMessagingTiers(["PHP", "PHP_Plus", "PHP_Premium"]);
      return;
    }
    if (Array.isArray(raw)) {
      setLocalMessagingTiers(raw.length ? [...raw] : []);
    }
  }, [adminProfile]);

  // --- Stable refs so socket handlers always see latest values ---
  const selectedUserIdRef = useRef(selectedUserId);
  const selectedGroupIdRef = useRef(selectedGroupId);
  const selectedThreadNameRef = useRef<string | null>(null);
  const refetchThreadsRef = useRef(refetchThreads);
  const refetchMessagesRef = useRef<() => void>(() => {});
  const markThreadReadRef = useRef(markThreadRead);
  const playNotificationSoundRef = useRef(playNotificationSound);

  const enabledMessagingTiers = useMemo(() => {
    const raw = adminProfile?.settings?.messagingEnabledTiers;
    if (raw === undefined || raw === null) {
      return new Set<string>(["PHP", "PHP_Plus", "PHP_Premium"]);
    }
    if (Array.isArray(raw) && raw.length === 0) {
      return new Set<string>();
    }
    return new Set(Array.isArray(raw) ? raw.filter((t: unknown) => typeof t === "string") : []);
  }, [adminProfile]);

  const threads = useMemo<ThreadItem[]>(() => {
    const source = threadsData?.threads ?? [];
    const users = usersData?.users ?? [];
    const userThreads = new Map<number, any>();
    source.forEach((thread: any) => {
      userThreads.set(thread.userId, thread);
    });
    const eligibleUsers = users.filter((user: any) => {
      if (user.role === "admin" || user.role === "superAdmin" || user.role === "coach") {
        return false;
      }
      const tier = user.programTier ?? user.guardianProgramTier ?? user.currentProgramTier ?? null;
      const hasThread = userThreads.has(user.id);
      if (hasThread) return true;
      if (!tier) return false;
      return enabledMessagingTiers.has(tier);
    });
    const combined = eligibleUsers.map((user: any) => {
        const thread = userThreads.get(user.id);
        const timestamp = thread?.time ? new Date(thread.time).getTime() : 0;
        return {
          userId: user.id,
          name: user.name || user.email,
          athleteName: user.athleteName ?? null,
          preview: thread?.preview ?? "No messages yet",
          time: thread?.time
            ? new Date(thread.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          priority: (thread?.unread ?? 0) > 0,
          premium: Boolean(thread?.premium) || user.programTier === "PHP_Premium",
          unread: thread?.unread ?? 0,
          lastTimestamp: timestamp,
          role: user.role,
          hasAthlete: Boolean(user.athleteId),
          programTier: user.programTier ?? null,
          online: onlineUsers.includes(user.id),
          typing: typingMap[`user:${user.id}`]?.isTyping ?? false,
          avatarUrl: user.profilePicture ?? null,
        } as ThreadItem;
      });

    const tierWeight = (tier?: string | null) => {
      if (tier === "PHP_Premium") return 3;
      if (tier === "PHP_Plus") return 2;
      return 1;
    };

    return combined.sort((a, b) => {
      if ((b.unread ?? 0) !== (a.unread ?? 0)) {
        return (b.unread ?? 0) - (a.unread ?? 0);
      }
      return (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0);
    });
  }, [enabledMessagingTiers, onlineUsers, threadsData, typingMap, usersData]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.userId === selectedUserId) ?? null,
    [threads, selectedUserId]
  );
  const selectedThreadName = selectedThread?.name ?? null;

  // Keep refs in sync with latest values
  useEffect(() => { selectedUserIdRef.current = selectedUserId; }, [selectedUserId]);
  useEffect(() => { selectedGroupIdRef.current = selectedGroupId; }, [selectedGroupId]);
  useEffect(() => { selectedThreadNameRef.current = selectedThreadName; }, [selectedThreadName]);
  useEffect(() => { refetchThreadsRef.current = refetchThreads; }, [refetchThreads]);
  useEffect(() => { markThreadReadRef.current = markThreadRead; }, [markThreadRead]);
  useEffect(() => { playNotificationSoundRef.current = playNotificationSound; }, [playNotificationSound]);

  useEffect(() => {
    if (!selectedUserId) return;
    markThreadRead({ userId: selectedUserId })
      .unwrap()
      .then(() => refetchThreads())
      .catch(() => undefined);
  }, [markThreadRead, refetchThreads, selectedUserId]);

  useEffect(() => {
    if (inboxMode === "direct" && !selectedUserId && threads.length) {
      setSelectedUserId(threads[0].userId);
    }
  }, [inboxMode, selectedUserId, threads]);

  useEffect(() => {
    if (inboxMode !== "direct") return;
    if (!selectedUserId) return;
    if (threads.some((t) => t.userId === selectedUserId)) return;
    setSelectedUserId(threads[0]?.userId ?? null);
  }, [inboxMode, selectedUserId, threads]);

  const groups = useMemo(() => {
    return (groupsData?.groups ?? []).map((group: any) => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
    }));
  }, [groupsData]);

  useEffect(() => {
    if (inboxMode === "group" && !selectedGroupId && groups.length) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, inboxMode, selectedGroupId]);

  const { data: messagesData, refetch: refetchMessages } = useGetMessagesQuery(selectedUserId ?? skipToken);
  const { data: groupMessagesData, refetch: refetchGroupMessages } = useGetChatGroupMessagesQuery(
    selectedGroupId ?? skipToken
  );
  const { data: groupMembersData } = useGetChatGroupMembersQuery(selectedGroupId ?? skipToken);

  // Keep refetchMessages ref in sync (changes when selectedUserId changes the query)
  useEffect(() => { refetchMessagesRef.current = refetchMessages; }, [refetchMessages]);

  // --- Stable socket connection: connect once, never reconnect on state changes ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
    const socketEnvUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const apiEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const localDevHost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const fallbackLocalUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    const socketUrl = socketEnvUrl
      ? socketEnvUrl.replace(/\/api\/?$/, "")
      : localDevHost
      ? fallbackLocalUrl
      : apiEnvUrl
      ? apiEnvUrl.replace(/\/api\/?$/, "")
      : fallbackLocalUrl;
    const accessToken =
      typeof document !== "undefined"
        ? document.cookie
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith("accessTokenClient="))
            ?.split("=")[1] ?? ""
        : "";
    const socket: Socket = io(socketUrl, {
      auth: accessToken ? { token: accessToken } : undefined,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });
    socket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected:", reason);
    });
    socket.on("reconnect", (attempt: number) => {
      console.log("[Socket] Reconnected after", attempt, "attempts");
    });

    socket.on("message:new", (payload: any) => {
      console.log("[Socket] Received message:new event:", payload);
      if (!payload?.id) return;
      if (lastNotifiedRef.current === payload.id) return;
      lastNotifiedRef.current = payload.id;
      const senderId = Number(payload.senderId);
      const receiverId = Number(payload.receiverId);
      const currentUserId = selectedUserIdRef.current;
      const currentThreadName = selectedThreadNameRef.current;
      const isActiveThread = currentUserId != null && (senderId === currentUserId || receiverId === currentUserId);
      console.log("[Socket] Is active thread?", isActiveThread, "for user ID:", currentUserId);

      // Optimistic insert into local realtime messages — ALWAYS insert for active thread
      if (isActiveThread) {
        const newMsg: MessageItem = {
          id: String(payload.id),
          author: senderId === currentUserId ? (currentThreadName ?? "User") : "Coach",
          time: payload.createdAt
            ? new Date(payload.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: payload.content ?? "",
          mediaUrl: payload.mediaUrl ?? null,
          contentType: payload.contentType ?? "text",
          reactions: [],
          status: "delivered",
        };
        setRealtimeDirectMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          if (payload.clientId) {
            const withoutTemp = prev.filter((m) => m.id !== payload.clientId);
            return [...withoutTemp, newMsg];
          }
          return [...prev, newMsg];
        });
        markThreadReadRef.current({ userId: currentUserId! }).unwrap().catch(() => undefined);
        setTimeout(() => window.dispatchEvent(new CustomEvent("messages:scroll")), 0);
      }

      // Refetch in background — wrapped in try/catch so ETIMEDOUT doesn't break anything
      try { refetchMessagesRef.current(); } catch { /* ignore timeout */ }
      try { refetchThreadsRef.current(); } catch { /* ignore timeout */ }

      if (!isActiveThread) {
        const isResponseVideo = payload.contentType === "video" && Number.isFinite(payload.videoUploadId);
        const toastTitle = isResponseVideo ? "Coach response video" : "New message";
        const toastBody = isResponseVideo ? "A coach response video is ready." : payload.content ?? "You received a new message";
        playNotificationSoundRef.current();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(toastTitle, { body: toastBody });
        }
        toast.info(toastTitle, toastBody);
      }
    });

    socket.on("group:message", (payload: any) => {
      if (!payload?.id) return;
      if (lastNotifiedRef.current === payload.id) return;
      lastNotifiedRef.current = payload.id;
      const groupId = Number(payload.groupId);
      const currentGroupId = selectedGroupIdRef.current;
      const isActiveGroup = currentGroupId != null && groupId === currentGroupId;

      if (isActiveGroup) {
        const newMsg: MessageItem = {
          id: `group-${payload.id}`,
          author: payload.senderName ?? `User ${payload.senderId}`,
          time: payload.createdAt
            ? new Date(payload.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: payload.content ?? "",
          mediaUrl: payload.mediaUrl ?? null,
          contentType: payload.contentType ?? "text",
          reactions: [],
          status: "delivered",
        };
        setRealtimeGroupMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          if (payload.clientId) {
            const withoutTemp = prev.filter((m) => m.id !== payload.clientId);
            return [...withoutTemp, newMsg];
          }
          return [...prev, newMsg];
        });
        setTimeout(() => window.dispatchEvent(new CustomEvent("messages:scroll")), 0);
      } else {
        playNotificationSoundRef.current();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New group message", { body: payload.content ?? "You received a group message" });
        }
        toast.info("New group message", payload.content ?? "You received a group message");
      }
    });

    socket.on("message:reaction", (payload: { messageId: number; reactions: any[] }) => {
      if (!payload?.messageId) return;
      const id = String(payload.messageId);
      const mapped = (payload.reactions ?? []).map((r: any) => ({ emoji: r.emoji, count: r.count, reactedByMe: false }));
      setRealtimeDirectMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, reactions: mapped } : m))
      );
    });
    socket.on("group:reaction", (payload: { messageId: number; reactions: any[] }) => {
      if (!payload?.messageId) return;
      const id = `group-${payload.messageId}`;
      const mapped = (payload.reactions ?? []).map((r: any) => ({ emoji: r.emoji, count: r.count, reactedByMe: false }));
      setRealtimeGroupMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, reactions: mapped } : m))
      );
    });

    socket.on("message:deleted", (payload: { messageId: number }) => {
      if (!payload?.messageId) return;
      const id = String(payload.messageId);
      setRealtimeDirectMessages((prev) => prev.filter((m) => m.id !== id));
      refetchThreadsRef.current();
    });
    socket.on("group:message:deleted", (payload: { messageId: number }) => {
      if (!payload?.messageId) return;
      const id = `group-${payload.messageId}`;
      setRealtimeGroupMessages((prev) => prev.filter((m) => m.id !== id));
    });

    socket.on("presence:update", (payload: number[]) => {
      setOnlineUsers(Array.isArray(payload) ? payload : []);
    });
    socket.on("typing:update", (payload: { fromUserId: number; name: string; isTyping: boolean; scope: string; groupId?: number }) => {
      const key = payload.scope === "group" ? `group:${payload.groupId}` : `user:${payload.fromUserId}`;
      setTypingMap((prev) => ({
        ...prev,
        [key]: { name: payload.name, isTyping: payload.isTyping },
      }));
    });
    socket.on("connect_error", (error) => {
      console.warn("[Socket] Connection error:", error.message);
    });

    // Polling fallback: refetch every 15s in case socket events are missed
    const pollInterval = setInterval(() => {
      try { refetchMessagesRef.current(); } catch { /* ignore */ }
      try { refetchThreadsRef.current(); } catch { /* ignore */ }
    }, 15_000);

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = useMemo<MessageItem[]>(() => {
    if (!selectedThread) return [];
    const source = messagesData?.messages ?? [];
    const base = source.map((msg: any) => ({
      id: String(msg.id),
      author: msg.senderId === selectedUserId ? (selectedThreadName ?? selectedThread.name) : "Coach",
      time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      text: msg.content,
      mediaUrl: msg.mediaUrl ?? null,
      contentType: msg.contentType ?? "text",
      reactions: (msg.reactions ?? []).map((reaction: any) => ({
        emoji: reaction.emoji,
        count: reaction.count,
        reactedByMe: false,
      })),
      status: msg.read ? "read" : "delivered",
    })) as MessageItem[];
    // Merge realtime messages that are not already in the base
    const baseIds = new Set(base.map((m) => m.id));
    const extras = realtimeDirectMessages.filter((m) => !baseIds.has(m.id));
    return [...base, ...extras];
  }, [messagesData, realtimeDirectMessages, selectedThread, selectedThreadName, selectedUserId]);

  // Clear realtime overlay when switching threads
  useEffect(() => {
    setRealtimeDirectMessages([]);
  }, [selectedUserId]);
  useEffect(() => {
    setRealtimeGroupMessages([]);
  }, [selectedGroupId]);

  const groupMessages = useMemo<MessageItem[]>(() => {
    if (!selectedGroupId) return [];
    const members = groupMembersData?.members ?? [];
    const lookup = new Map<number, string>(members.map((m: any) => [m.userId, m.name || m.email]));
    const source = groupMessagesData?.messages ?? [];
    const base = source.map((msg: any) => ({
      id: `group-${msg.id}`,
      author: lookup.get(msg.senderId) ?? `User ${msg.senderId}`,
      time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      text: msg.content,
      mediaUrl: msg.mediaUrl ?? null,
      contentType: msg.contentType ?? "text",
      reactions: (msg.reactions ?? []).map((reaction: any) => ({
        emoji: reaction.emoji,
        count: reaction.count,
        reactedByMe: false,
      })),
      status: "delivered",
    })) as MessageItem[];
    const baseIds = new Set(base.map((m) => m.id));
    const extras = realtimeGroupMessages.filter((m) => !baseIds.has(m.id));
    return [...base, ...extras];
  }, [groupMembersData, groupMessagesData, realtimeGroupMessages, selectedGroupId]);

  const filteredThreads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = threads.filter((thread) => thread.role !== "admin" && thread.role !== "coach");
    if (activeFilter === "Unread") result = result.filter((thread) => (thread.unread ?? 0) > 0);
    if (activeFilter === "Premium") result = result.filter((thread) => thread.premium);
    result = result.map((thread) => ({
      ...thread,
      displayName: thread.name,
    }));
    if (term) {
      result = result.filter((thread) =>
        (thread.displayName ?? thread.name).toLowerCase().includes(term)
      );
    }
    return result;
  }, [activeFilter, threads, searchTerm]);

  const filterCounts = useMemo(() => {
    const guardianThreads = threads.filter((thread) => thread.role === "guardian");
    return {
      All: guardianThreads.length,
      Unread: guardianThreads.filter((thread) => (thread.unread ?? 0) > 0).length,
      Premium: guardianThreads.filter((thread) => thread.premium).length,
    };
  }, [threads]);
  const inboxUnreadCount = filterCounts.Unread ?? 0;

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = groups;
    if (term) {
      result = result.filter((group) => group.name.toLowerCase().includes(term));
    }
    return result;
  }, [groups, searchTerm]);

  const handleDeleteMessage = async (messageId: string, mode: "direct" | "group", groupId: number | null) => {
    try {
      if (mode === "group") {
        if (!groupId) return;
        const parsed = Number(messageId.replace("group-", ""));
        if (!Number.isFinite(parsed)) return;
        await deleteGroupMessage({ groupId, messageId: parsed }).unwrap();
        await refetchGroupMessages();
      } else {
        const parsed = Number(messageId);
        if (!Number.isFinite(parsed)) return;
        await deleteMessage({ messageId: parsed }).unwrap();
        await refetchMessages();
        await refetchThreads();
      }
      toast.success("Message deleted");
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Delete failed";
      toast.error("Delete failed", msg);
    }
  };

  const formatBytes = (sizeBytes: number) => {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 KB";
    if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
    if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const uploadAttachment = async (attachment: ComposerAttachment) => {
    const file = attachment.file;
    const inferredType =
      file.type || (attachment.kind === "image" ? "image/jpeg" : "application/octet-stream");
    const folder = attachment.kind === "image" ? "messages/images" : "messages/files";
    const presign = await createMediaUploadUrl({
      folder,
      fileName: file.name,
      contentType: inferredType,
      sizeBytes: file.size,
    }).unwrap();

    const sizeLabel = formatBytes(file.size);
    setUploadState({ name: file.name, sizeLabel, progress: 0 });
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presign.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", inferredType);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadState({ name: file.name, sizeLabel, progress });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Failed to upload attachment"));
        }
      };
      xhr.onerror = () => reject(new Error("Failed to upload attachment"));
      xhr.send(file);
    }).finally(() => {
      setUploadState(null);
    });

    const mappedContentType: "text" | "image" | "video" = inferredType.startsWith("image/")
      ? "image"
      : inferredType.startsWith("video/")
      ? "video"
      : "text";

    return {
      mediaUrl: presign.publicUrl,
      contentType: mappedContentType,
      fallbackContent: `${file.name} • ${formatBytes(file.size)}`,
    };
  };

  return (
    <AdminShell
      title="Messaging"
      subtitle="Priority inbox and coach responses. Mobile app feedback (More → Send Feedback) shows up here as direct messages starting with [App feedback — …], even for tiers without normal messaging."
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Messaging by plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Turn plans on or off for <strong>new</strong> client messages. Existing threads stay in the inbox so you can finish conversations.
          </p>
          <p className="mt-3 border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">In-app feedback:</span> athletes submit from the PHP mobile app; deliveries use the same threads as coach chat—search or scan previews for the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">[App feedback</code> prefix.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          {(["PHP", "PHP_Plus", "PHP_Premium"] as const).map((tier) => (
            <label key={tier} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={localMessagingTiers.includes(tier)}
                onChange={(e) => {
                  setLocalMessagingTiers((prev) => {
                    if (e.target.checked) {
                      return prev.includes(tier) ? prev : [...prev, tier];
                    }
                    return prev.filter((t) => t !== tier);
                  });
                }}
              />
              {tier === "PHP" ? "PHP Program" : tier === "PHP_Plus" ? "PHP Plus" : "PHP Premium"}
            </label>
          ))}
          <Button
            size="sm"
            className="sm:ml-2"
            disabled={savingMessagingAccess}
            onClick={async () => {
              try {
                await updateMessagingAccess({ tiers: localMessagingTiers }).unwrap();
                toast.success("Saved", "Messaging access updated.");
              } catch (err: any) {
                toast.error("Save failed", err?.data?.error ?? "Please try again.");
              }
            }}
          >
            {savingMessagingAccess ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className={`h-full lg:h-[calc(100vh-11rem)] ${mobileView === "conversation" ? "hidden lg:block" : ""}`}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
                <p className="text-sm text-muted-foreground">
                  Connect with every athlete and guardian.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isMarkingAll || inboxUnreadCount === 0}
                onClick={async () => {
                  if (!threads.length) return;
                  setIsMarkingAll(true);
                  try {
                    const targets = threads.filter((thread) => (thread.unread ?? 0) > 0);
                    await Promise.all(targets.map((thread) => markThreadRead({ userId: thread.userId }).unwrap()));
                    refetchThreads();
                  } catch (err: any) {
                    toast.error("Mark all failed", err?.message ?? "Please try again.");
                  } finally {
                    setIsMarkingAll(false);
                  }
                }}
              >
                {isMarkingAll ? "Marking..." : "Mark All Read"}
              </Button>
              {inboxMode === "direct" && inboxUnreadCount > 0 ? (
                <Badge variant="primary">{inboxUnreadCount}</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="h-full overflow-visible lg:overflow-hidden">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                variant={inboxMode === "direct" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setInboxMode("direct");
                  setMobileView("inbox");
                }}
              >
                Direct
              </Button>
              <Button
                variant={inboxMode === "group" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setInboxMode("group");
                  setMobileView("inbox");
                }}
              >
                Groups
              </Button>
            </div>
            {inboxMode === "group" ? (
              <GroupInboxPanel
                groups={filteredGroups}
                selectedGroupId={selectedGroupId}
                users={usersData?.users ?? []}
                selectedMemberIds={selectedMemberIds}
                newGroupName={newGroupName}
                isCreatingGroup={isCreatingGroup}
                onSelectGroup={(groupId) => {
                  setSelectedGroupId(groupId);
                  setMobileView("conversation");
                }}
                onNewGroupNameChange={setNewGroupName}
                onToggleMember={(memberId) => {
                  setSelectedMemberIds((prev) =>
                    prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
                  );
                }}
                onCreateGroup={async () => {
                  if (!newGroupName.trim()) return;
                  try {
                    const response = await createGroup({
                      name: newGroupName.trim(),
                      memberIds: selectedMemberIds,
                    }).unwrap();
                    setNewGroupName("");
                    setSelectedMemberIds([]);
                    refetchGroups();
                    setSelectedGroupId(response.group.id);
                    toast.success("Group created", "Your new chat group is ready.");
                  } catch (err: any) {
                    toast.error("Group creation failed", err?.data?.error || "Please try again.");
                  }
                }}
              />
            ) : (
              <div className="lg:h-[calc(100%-3.5rem)] lg:overflow-y-auto pr-1">
                <InboxList
                  threads={filteredThreads}
                  selected={selectedUserId}
                  onSelect={(userId) => {
                    setSelectedUserId(userId);
                    setMobileView("conversation");
                  }}
                  onMarkRead={async (userId) => {
                    try {
                      await markThreadRead({ userId }).unwrap();
                      refetchThreads();
                    } catch (err: any) {
                      toast.error("Mark read failed", err?.message ?? "Please try again.");
                    }
                  }}
                  onDeleteThread={async (userId) => {
                    const confirmed = window.confirm("Delete this chat? This cannot be undone.");
                    if (!confirmed) return;
                    try {
                      await deleteThread({ userId }).unwrap();
                      refetchThreads();
                      refetchMessages();
                      if (selectedUserId === userId) {
                        setSelectedUserId(null);
                      }
                    } catch (err: any) {
                      toast.error("Delete chat failed", err?.message ?? "Please try again.");
                    }
                  }}
                  onFilterSelect={setActiveFilter}
                  searchValue={searchTerm}
                  onSearch={setSearchTerm}
                  activeFilter={activeFilter}
                  counts={filterCounts}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <MessagingConversationCard
          showBack={mobileView === "conversation"}
          onBack={() => setMobileView("inbox")}
          className={mobileView === "inbox" ? "hidden lg:block" : ""}
          inboxMode={inboxMode}
          groups={groups}
          selectedGroupId={selectedGroupId}
          selectedUserId={selectedUserId}
          selectedThreadName={selectedThreadName}
          selectedThreadExists={Boolean(selectedThread)}
          selectedThreadPremium={selectedThread?.premium ?? false}
          typingMap={typingMap}
          messages={messages}
          groupMessages={groupMessages}
          uploadState={uploadState}
          onTypingChange={(isTyping) => {
            const socket = socketRef.current;
            if (!socket) return;
            if (inboxMode === "group" && selectedGroupId) {
              socket.emit(isTyping ? "typing:start" : "typing:stop", { groupId: selectedGroupId });
            }
            if (inboxMode === "direct" && selectedUserId) {
              socket.emit(isTyping ? "typing:start" : "typing:stop", { toUserId: selectedUserId });
            }
          }}
          onSend={async ({ text, attachment }) => {
            const trimmed = text.trim();
            let mediaPayload: { mediaUrl: string; contentType: "text" | "image" | "video"; fallbackContent: string } | null =
              null;
            if (attachment) {
              try {
                mediaPayload = await uploadAttachment(attachment);
              } catch (err: any) {
                toast.error("Upload failed", err?.message || "Please try again.");
                return;
              }
            }
            const content = trimmed || mediaPayload?.fallbackContent || "";
            if (!content && !mediaPayload) return;
            const socket = socketRef.current;

            if (inboxMode === "group") {
              if (!selectedGroupId) return;
              const clientId = `client-${Date.now()}`;
              // Optimistic insert
              setRealtimeGroupMessages((prev) => [
                ...prev,
                {
                  id: clientId,
                  author: "Coach",
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  text: content,
                  mediaUrl: mediaPayload?.mediaUrl ?? null,
                  contentType: mediaPayload?.contentType ?? "text",
                  reactions: [],
                  status: "sent",
                },
              ]);
              setTimeout(() => window.dispatchEvent(new CustomEvent("messages:scroll")), 0);
              if (socket?.connected) {
                socket.emit("group:send", {
                  groupId: selectedGroupId,
                  content,
                  contentType: mediaPayload?.contentType ?? "text",
                  mediaUrl: mediaPayload?.mediaUrl,
                  clientId,
                });
              } else {
                try {
                  await sendGroupMessage({
                    groupId: selectedGroupId,
                    content,
                    contentType: mediaPayload?.contentType ?? "text",
                    mediaUrl: mediaPayload?.mediaUrl,
                  }).unwrap();
                } catch (err: any) {
                  toast.error("Send failed", err?.data?.error || "Please try again.");
                }
              }
              return;
            }
            if (!selectedUserId) return;
            const clientId = `client-${Date.now()}`;
            // Optimistic insert
            setRealtimeDirectMessages((prev) => [
              ...prev,
              {
                id: clientId,
                author: "Coach",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: content,
                mediaUrl: mediaPayload?.mediaUrl ?? null,
                contentType: mediaPayload?.contentType ?? "text",
                reactions: [],
                status: "sent",
              },
            ]);
            setTimeout(() => window.dispatchEvent(new CustomEvent("messages:scroll")), 0);
            if (socket?.connected) {
              socket.emit("message:send", {
                toUserId: selectedUserId,
                content,
                contentType: mediaPayload?.contentType ?? "text",
                mediaUrl: mediaPayload?.mediaUrl,
                clientId,
              });
            } else {
              try {
                await sendMessage({
                  userId: selectedUserId,
                  content,
                  contentType: mediaPayload?.contentType ?? "text",
                  mediaUrl: mediaPayload?.mediaUrl,
                }).unwrap();
              } catch (err: any) {
                toast.error("Send failed", err?.data?.error || "Please try again.");
              }
            }
          }}
          onReact={async (messageId, emoji) => {
            if (inboxMode === "group") {
              if (!selectedGroupId) return;
              const parsed = Number(messageId.replace("group-", ""));
              if (!Number.isFinite(parsed)) return;
              try {
                await toggleGroupMessageReaction({
                  groupId: selectedGroupId,
                  messageId: parsed,
                  emoji,
                }).unwrap();
              } catch (err: any) {
                toast.error("Reaction failed", err?.data?.error || "Please try again.");
              }
              return;
            }
            const parsed = Number(messageId);
            if (!Number.isFinite(parsed)) return;
            try {
              await toggleMessageReaction({
                messageId: parsed,
                emoji,
              }).unwrap();
            } catch (err: any) {
              toast.error("Reaction failed", err?.data?.error || "Please try again.");
            }
          }}
          onDelete={handleDeleteMessage}
        />
      </div>

      <MessageDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}

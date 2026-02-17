"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { io, Socket } from "socket.io-client";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
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
  useSendChatGroupMessageMutation,
  useSendMessageMutation,
  useToggleChatGroupMessageReactionMutation,
  useToggleMessageReactionMutation,
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
  const [activeDialog, setActiveDialog] = useState<MessagingDialog>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [inboxMode, setInboxMode] = useState<"direct" | "group">("direct");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, { name: string; isTyping: boolean }>>({});
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
  const [markThreadRead] = useMarkThreadReadMutation();
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const lastNotifiedRef = useRef<number | null>(null);

  const threads = useMemo<ThreadItem[]>(() => {
    const source = threadsData?.threads ?? [];
    const users = usersData?.users ?? [];
    const userThreads = new Map<number, any>();
    source.forEach((thread: any) => {
      userThreads.set(thread.userId, thread);
    });
    const combined = users.map((user: any) => {
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
          online: onlineUsers.includes(user.id),
          typing: typingMap[`user:${user.id}`]?.isTyping ?? false,
          avatarUrl: user.profilePicture ?? null,
        } as ThreadItem;
      });

    return combined.sort((a, b) => {
      if (a.premium !== b.premium) {
        return a.premium ? -1 : 1;
      }
      if ((b.unread ?? 0) !== (a.unread ?? 0)) {
        return (b.unread ?? 0) - (a.unread ?? 0);
      }
      return (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0);
    });
  }, [onlineUsers, threadsData, typingMap, usersData]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.userId === selectedUserId) ?? null,
    [threads, selectedUserId]
  );
  const selectedThreadName = selectedThread?.name ?? null;

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
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;
    const handleIncoming = () => {
      refetchThreads();
      refetchGroups();
      if (selectedUserId) {
        refetchMessages();
      }
      if (selectedGroupId) {
        refetchGroupMessages();
      }
    };
    socket.on("message:new", (payload: any) => {
      handleIncoming();
      if (!payload?.id) return;
      if (lastNotifiedRef.current === payload.id) return;
      lastNotifiedRef.current = payload.id;
      const senderId = Number(payload.senderId);
      const receiverId = Number(payload.receiverId);
      const isActiveThread = selectedUserId && (senderId === selectedUserId || receiverId === selectedUserId);

      if (isActiveThread) {
        markThreadRead({ userId: selectedUserId! })
          .unwrap()
          .then(() => {
            refetchThreads();
            refetchMessages();
          })
          .catch(() => undefined);
        setTimeout(() => window.dispatchEvent(new CustomEvent("messages:scroll")), 0);
        return;
      }

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New message", { body: payload.content ?? "You received a new message" });
      }
    });
    socket.on("group:message", (payload: any) => {
      handleIncoming();
      if (!payload?.id) return;
      if (lastNotifiedRef.current === payload.id) return;
      lastNotifiedRef.current = payload.id;
      const isActiveGroup = selectedGroupId && Number(payload.groupId) === selectedGroupId;
      if (isActiveGroup) {
        setTimeout(() => window.dispatchEvent(new CustomEvent("messages:scroll")), 0);
        return;
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New group message", { body: payload.content ?? "You received a group message" });
      }
    });
    socket.on("message:reaction", handleIncoming);
    socket.on("group:reaction", handleIncoming);
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
      console.warn("Messaging socket connection failed", error.message);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [refetchGroups, refetchGroupMessages, refetchMessages, refetchThreads, selectedGroupId, selectedUserId]);

  const messages = useMemo<MessageItem[]>(() => {
    if (!selectedThread) return [];
    const source = messagesData?.messages ?? [];
    return source.map((msg: any) => ({
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
    }));
  }, [messagesData, selectedThread, selectedThreadName, selectedUserId]);

  const groupMessages = useMemo<MessageItem[]>(() => {
    if (!selectedGroupId) return [];
    const members = groupMembersData?.members ?? [];
    const lookup = new Map<number, string>(members.map((m: any) => [m.userId, m.name || m.email]));
    const source = groupMessagesData?.messages ?? [];
    return source.map((msg: any) => ({
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
    }));
  }, [groupMembersData, groupMessagesData, selectedGroupId]);

  const filteredThreads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = threads;
    if (activeFilter === "Guardian") result = result.filter((thread) => thread.role === "guardian");
    if (activeFilter === "Athlete") result = result.filter((thread) => thread.role === "athlete");
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
    return {
      All: threads.length,
      Guardian: threads.filter((thread) => thread.role === "guardian").length,
      Athlete: threads.filter((thread) => thread.role === "athlete").length,
      Unread: threads.filter((thread) => (thread.unread ?? 0) > 0).length,
      Premium: threads.filter((thread) => thread.premium).length,
    };
  }, [threads]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = groups;
    if (term) {
      result = result.filter((group) => group.name.toLowerCase().includes(term));
    }
    return result;
  }, [groups, searchTerm]);

  const uploadAttachment = async (attachment: ComposerAttachment) => {
    const file = attachment.file;
    const inferredType = file.type || (attachment.kind === "image" ? "image/jpeg" : "application/octet-stream");
    const folder = attachment.kind === "image" ? "messages/images" : "messages/files";
    const presign = await createMediaUploadUrl({
      folder,
      fileName: file.name,
      contentType: inferredType,
      sizeBytes: file.size,
    }).unwrap();

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": inferredType,
      },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error("Failed to upload attachment");
    }

    const mappedContentType: "text" | "image" | "video" = inferredType.startsWith("image/")
      ? "image"
      : inferredType.startsWith("video/")
      ? "video"
      : "text";

    return {
      mediaUrl: presign.publicUrl,
      contentType: mappedContentType,
      fallbackContent: file.name,
    };
  };

  return (
    <AdminShell
      title="Messaging"
      subtitle="Priority inbox and coach responses."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="h-full lg:h-[calc(100vh-11rem)]">
          <CardHeader>
            <SectionHeader title="Inbox" description="Connect with every athlete and guardian." />
          </CardHeader>
          <CardContent className="h-full overflow-hidden">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                variant={inboxMode === "direct" ? "default" : "outline"}
                size="sm"
                onClick={() => setInboxMode("direct")}
              >
                Direct
              </Button>
              <Button
                variant={inboxMode === "group" ? "default" : "outline"}
                size="sm"
                onClick={() => setInboxMode("group")}
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
                onSelectGroup={setSelectedGroupId}
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
              <div className="h-[calc(100%-3.5rem)] overflow-y-auto pr-1">
                <InboxList
                  threads={filteredThreads}
                  selected={selectedUserId}
                  onSelect={setSelectedUserId}
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

            if (inboxMode === "group") {
              if (!selectedGroupId || isSendingGroup) return;
              try {
                await sendGroupMessage({
                  groupId: selectedGroupId,
                  content,
                  contentType: mediaPayload?.contentType ?? "text",
                  mediaUrl: mediaPayload?.mediaUrl,
                }).unwrap();
                refetchGroupMessages();
                toast.success("Message sent", "Group updated.");
              } catch (err: any) {
                toast.error("Send failed", err?.data?.error || "Please try again.");
              }
              return;
            }
            if (!selectedUserId || isSending) return;
            try {
              await sendMessage({
                userId: selectedUserId,
                content,
                contentType: mediaPayload?.contentType ?? "text",
                mediaUrl: mediaPayload?.mediaUrl,
              }).unwrap();
              refetchMessages();
              toast.success("Message sent", "The athlete will be notified.");
            } catch (err: any) {
              toast.error("Send failed", err?.data?.error || "Please try again.");
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
        />
      </div>

      <MessageDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}

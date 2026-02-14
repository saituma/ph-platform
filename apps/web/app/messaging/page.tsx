"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { io, Socket } from "socket.io-client";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { InboxList } from "../../components/admin/messaging/inbox-list";
import { ConversationPanel } from "../../components/admin/messaging/conversation-panel";
import { MessageDialogs, type MessagingDialog } from "../../components/admin/messaging/message-dialogs";
import {
  useCreateChatGroupMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useGetChatGroupsQuery,
  useGetMessagesQuery,
  useGetThreadsQuery,
  useGetUsersQuery,
  useSendChatGroupMessageMutation,
  useSendMessageMutation,
  useToggleChatGroupMessageReactionMutation,
  useToggleMessageReactionMutation,
} from "../../lib/apiSlice";

type ThreadItem = {
  userId: number;
  name: string;
  displayName?: string;
  preview: string;
  time: string;
  priority: boolean;
  unread?: number;
  pinned?: boolean;
  lastTimestamp?: number;
  role?: string;
  hasAthlete?: boolean;
  athleteName?: string | null;
  typing?: boolean;
};

type MessageItem = {
  id: string;
  author: string;
  time: string;
  text: string;
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
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [sendGroupMessage, { isLoading: isSendingGroup }] = useSendChatGroupMessageMutation();
  const [toggleMessageReaction] = useToggleMessageReactionMutation();
  const [toggleGroupMessageReaction] = useToggleChatGroupMessageReactionMutation();
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const threads = useMemo<ThreadItem[]>(() => {
    const source = threadsData?.threads ?? [];
    const users = usersData?.users ?? [];
    const userThreads = new Map<number, any>();
    source.forEach((thread: any) => {
      userThreads.set(thread.userId, thread);
    });
    const combined = users
      .filter((user: any) => user.role !== "admin")
      .map((user: any) => {
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
          unread: thread?.unread ?? 0,
          lastTimestamp: timestamp,
          role: user.role,
          hasAthlete: Boolean(user.athleteId),
          online: onlineUsers.includes(user.id),
          typing: typingMap[`user:${user.id}`]?.isTyping ?? false,
        } as ThreadItem;
      });

    return combined.sort((a, b) => {
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
    const socket: Socket = io(socketUrl, {
      transports: ["websocket"],
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
    socket.on("message:new", handleIncoming);
    socket.on("group:message", handleIncoming);
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
    if (activeFilter === "Premium") result = result.filter((thread) => thread.priority);
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

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = groups;
    if (term) {
      result = result.filter((group) => group.name.toLowerCase().includes(term));
    }
    return result;
  }, [groups, searchTerm]);

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
              <div className="space-y-4 h-[calc(100%-3.5rem)] overflow-y-auto pr-1">
                <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Create group chat</p>
                  <p className="text-xs text-muted-foreground">Add guardians/athletes to a shared conversation.</p>
                  <div className="mt-3 grid gap-3">
                    <input
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                      placeholder="Group name"
                      value={newGroupName}
                      onChange={(event) => setNewGroupName(event.target.value)}
                    />
                    <div className="grid gap-2">
                      {(usersData?.users ?? [])
                        .filter((user: any) => user.role !== "admin")
                        .map((user: any) => (
                          <label key={user.id} className="flex items-center gap-2 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(user.id)}
                              onChange={() => {
                                setSelectedMemberIds((prev) =>
                                  prev.includes(user.id)
                                    ? prev.filter((id) => id !== user.id)
                                    : [...prev, user.id]
                                );
                              }}
                            />
                            {user.name || user.email}
                          </label>
                        ))}
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newGroupName.trim()) return;
                        const response = await createGroup({
                          name: newGroupName.trim(),
                          memberIds: selectedMemberIds,
                        }).unwrap();
                        setNewGroupName("");
                        setSelectedMemberIds([]);
                        refetchGroups();
                        setSelectedGroupId(response.group.id);
                      }}
                      disabled={isCreatingGroup}
                    >
                      {isCreatingGroup ? "Creating..." : "Create Group"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left text-sm transition ${
                        selectedGroupId === group.id
                          ? "bg-background"
                          : "bg-secondary/40 hover:border-primary/40"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-foreground">{group.name}</p>
                        <p className="text-xs text-muted-foreground">Group chat</p>
                      </div>
                    </button>
                  ))}
                  {!filteredGroups.length ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                      No groups yet.
                    </div>
                  ) : null}
                </div>
              </div>
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
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <SectionHeader
              title={
                inboxMode === "group"
                  ? groups.find((group) => group.id === selectedGroupId)?.name ?? "Group Conversation"
                  : selectedThreadName ?? "Conversation"
              }
              description={
                inboxMode === "group"
                  ? selectedGroupId
                    ? "Group chat"
                    : "Select a group"
                  : selectedThread
                  ? "Active"
                  : "Select a thread"
              }
            />
          </CardHeader>
          <CardContent>
            <ConversationPanel
              name={
                inboxMode === "group"
                  ? groups.find((group) => group.id === selectedGroupId)?.name ?? null
                  : selectedThreadName
              }
              messages={inboxMode === "group" ? groupMessages : messages}
              profile={null}
              typingLabel={
                inboxMode === "group"
                  ? typingMap[`group:${selectedGroupId}`]?.isTyping
                    ? `${typingMap[`group:${selectedGroupId}`]?.name} is typing...`
                    : null
                  : typingMap[`user:${selectedUserId}`]?.isTyping
                  ? `${typingMap[`user:${selectedUserId}`]?.name} is typing...`
                  : null
              }
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
              onSend={async (text) => {
                if (inboxMode === "group") {
                  if (!selectedGroupId) return;
                  if (isSendingGroup) return;
                  await sendGroupMessage({ groupId: selectedGroupId, content: text }).unwrap();
                  refetchGroupMessages();
                } else {
                  if (!selectedUserId) return;
                  if (isSending) return;
                  await sendMessage({ userId: selectedUserId, content: text }).unwrap();
                  refetchMessages();
                }
              }}
              onReact={async (messageId, emoji) => {
                if (inboxMode === "group") {
                  if (!selectedGroupId) return;
                  const parsed = Number(messageId.replace("group-", ""));
                  if (!Number.isFinite(parsed)) return;
                  await toggleGroupMessageReaction({
                    groupId: selectedGroupId,
                    messageId: parsed,
                    emoji,
                  }).unwrap();
                } else {
                  const parsed = Number(messageId);
                  if (!Number.isFinite(parsed)) return;
                  await toggleMessageReaction({
                    messageId: parsed,
                    emoji,
                  }).unwrap();
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <MessageDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}

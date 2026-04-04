"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { BarChart3, MessageCircle, Megaphone, Plus, Users2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "../../components/admin/messaging/chat-composer";
import { TenorPickerDialog } from "../../components/admin/messaging/tenor-picker-dialog";
import { ThreadMessageList } from "../../components/admin/messaging/thread-message-list";
import type {
  AnnouncementItem,
  ChatMessage,
  ChatReaction,
  ChatGroupItem,
  MessagingUser,
  ThreadApiItem,
} from "../../components/admin/messaging/types";
import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Select } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import {
  useCreateChatGroupMutation,
  useCreateContentMutation,
  useCreateMediaUploadUrlMutation,
  useGetAdminProfileQuery,
  useGetAnnouncementsQuery,
  useGetChatGroupMessagesQuery,
  useGetChatGroupsQuery,
  useGetMessagesQuery,
  useGetThreadsQuery,
  useGetUsersQuery,
  useMarkThreadReadMutation,
  useSendChatGroupMessageMutation,
  useSendMessageMutation,
  useToggleChatGroupMessageReactionMutation,
  useToggleMessageReactionMutation,
} from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type ThreadListItem = {
  userId: number;
  name: string;
  preview: string;
  unread: number;
  updatedAt: string;
};

type AdminTeamSummary = {
  team: string;
  memberCount: number;
  guardianCount: number;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

type AdminTeamDetails = {
  team: string;
  members: Array<{
    guardianEmail: string | null;
  }>;
};

type AdminTeamsResponse = {
  error?: string;
  teams?: AdminTeamSummary[];
};

type GifApiResponse = {
  error?: string;
  results?: Array<{ id: string; url: string; previewUrl: string }>;
};

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MessagingPage() {
  const [tab, setTab] = useState("inbox");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");

  const [threadUserId, setThreadUserId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const [directMessage, setDirectMessage] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [activeUploadTarget, setActiveUploadTarget] = useState<"direct" | "group" | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [gifTarget, setGifTarget] = useState<"direct" | "group" | null>(null);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<Array<{ id: string; url: string; previewUrl: string }>>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [adminTeams, setAdminTeams] = useState<AdminTeamSummary[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [directReactionOverrides, setDirectReactionOverrides] = useState<Record<number, ChatReaction[]>>({});
  const [groupReactionOverrides, setGroupReactionOverrides] = useState<Record<number, ChatReaction[]>>({});

  const { data: announcementsData, refetch: refetchAnnouncements } = useGetAnnouncementsQuery();
  const { data: adminProfileData } = useGetAdminProfileQuery();
  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: groupsData, refetch: refetchGroups } = useGetChatGroupsQuery();

  const { data: directMessagesData, refetch: refetchDirectMessages } = useGetMessagesQuery(threadUserId ?? skipToken);
  const { data: groupMessagesData, refetch: refetchGroupMessages } = useGetChatGroupMessagesQuery(groupId ?? skipToken);

  const [createAnnouncement, { isLoading: isCreatingAnnouncement }] = useCreateContentMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();
  const [markThreadRead] = useMarkThreadReadMutation();
  const [sendDirect, { isLoading: isSendingDirect }] = useSendMessageMutation();
  const [sendGroup, { isLoading: isSendingGroup }] = useSendChatGroupMessageMutation();
  const [toggleDirectReaction] = useToggleMessageReactionMutation();
  const [toggleGroupReaction] = useToggleChatGroupMessageReactionMutation();
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateChatGroupMutation();

  const users = useMemo<MessagingUser[]>(() => (usersData?.users as MessagingUser[] | undefined) ?? [], [usersData]);

  const chatEligibleUsers = useMemo(
    () => users.filter((user) => user?.role !== "admin" && user?.role !== "superAdmin" && user?.role !== "coach"),
    [users],
  );

  useEffect(() => {
    const loadAdminTeams = async () => {
      setIsLoadingTeams(true);
      try {
        const response = await fetch("/api/backend/admin/teams", { credentials: "include" });
        const payload = (await response.json().catch(() => ({}))) as AdminTeamsResponse;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load teams.");
        }
        setAdminTeams(Array.isArray(payload?.teams) ? payload.teams : []);
      } catch {
        setAdminTeams([]);
      } finally {
        setIsLoadingTeams(false);
      }
    };
    void loadAdminTeams();
  }, []);

  useEffect(() => {
    if (groupId == null) {
      setGroupReactionOverrides({});
    }
  }, [groupId]);

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    chatEligibleUsers.forEach((user) => {
      map.set(user.id, user.name ?? user.email ?? `User ${user.id}`);
    });
    return map;
  }, [chatEligibleUsers]);

  const allUserNameById = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((user) => {
      map.set(user.id, user.name ?? user.email ?? `User ${user.id}`);
    });
    return map;
  }, [users]);

  const threads = useMemo<ThreadListItem[]>(() => {
    const source = (threadsData?.threads as ThreadApiItem[] | undefined) ?? [];
    const byUserId = new Map<number, ThreadApiItem>();
    source.forEach((thread) => {
      byUserId.set(Number(thread.userId), thread);
    });

    return chatEligibleUsers
      .map((user) => {
        const thread = byUserId.get(user.id);
        return {
          userId: user.id,
          name: userNameById.get(user.id) ?? user.name ?? user.email ?? `User ${user.id}`,
          preview: thread?.preview ?? "Start a conversation",
          unread: Number(thread?.unread ?? 0),
          updatedAt: thread?.time ?? "",
        };
      })
      .sort((a, b) => {
        if (b.unread !== a.unread) return b.unread - a.unread;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [chatEligibleUsers, threadsData, userNameById]);

  const groups = useMemo<ChatGroupItem[]>(() => (groupsData?.groups as ChatGroupItem[] | undefined) ?? [], [groupsData]);
  const announcements = useMemo<AnnouncementItem[]>(
    () => (announcementsData?.items as AnnouncementItem[] | undefined) ?? [],
    [announcementsData],
  );

  const directThreadName = useMemo(() => {
    if (!threadUserId) return "";
    return userNameById.get(threadUserId) ?? `User ${threadUserId}`;
  }, [threadUserId, userNameById]);

  const directMessages = useMemo<ChatMessage[]>(() => {
    const base = (directMessagesData?.messages as ChatMessage[] | undefined) ?? [];
    return base.map((message) => {
      const id = Number(message.id);
      if (!Number.isFinite(id)) return message;
      const reactions = directReactionOverrides[id];
      return reactions ? { ...message, reactions } : message;
    });
  }, [directMessagesData, directReactionOverrides]);

  const groupMessages = useMemo<ChatMessage[]>(() => {
    const base = (groupMessagesData?.messages as ChatMessage[] | undefined) ?? [];
    return base.map((message) => {
      const id = Number(message.id);
      if (!Number.isFinite(id)) return message;
      const reactions = groupReactionOverrides[id];
      return reactions ? { ...message, reactions } : message;
    });
  }, [groupMessagesData, groupReactionOverrides]);

  const stats = useMemo(() => {
    const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);
    return {
      totalAnnouncements: announcements.length,
      totalThreads: threads.length,
      unreadThreads: unread,
      totalGroups: groups.length,
    };
  }, [announcements.length, groups.length, threads]);

  const currentUserId = useMemo<number | null>(() => {
    const profilePayload = adminProfileData as
      | { id?: number | string; profile?: { id?: number | string } }
      | undefined;
    const idValue = profilePayload?.id ?? profilePayload?.profile?.id;
    const normalized = Number(idValue);
    return Number.isFinite(normalized) ? normalized : null;
  }, [adminProfileData]);

  const resolveUserName = (userId: number) => {
    if (currentUserId != null && userId === currentUserId) return "You";
    return allUserNameById.get(userId) ?? `User ${userId}`;
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    try {
      await createAnnouncement({
        title: announcementTitle.trim(),
        content: announcementTitle.trim(),
        body: announcementBody.trim(),
        type: "article",
        surface: "announcements",
      }).unwrap();
      setAnnouncementTitle("");
      setAnnouncementBody("");
      refetchAnnouncements();
      toast.success("Announcement sent", "Your announcement is now visible to users.");
    } catch {
      toast.error("Failed", "Could not publish announcement.");
    }
  };

  const openDirectThread = async (userId: number) => {
    setThreadUserId(userId);
    setDirectReactionOverrides({});
    try {
      await markThreadRead({ userId }).unwrap();
      refetchThreads();
      refetchDirectMessages();
    } catch {
      // keep opening modal even if mark-read fails
    }
  };

  const handleSendDirect = async () => {
    if (!threadUserId || !directMessage.trim()) return;
    try {
      await sendDirect({ userId: threadUserId, content: directMessage.trim(), contentType: "text" }).unwrap();
      setDirectMessage("");
      refetchDirectMessages();
      refetchThreads();
    } catch {
      toast.error("Failed", "Could not send message.");
    }
  };

  const handleSendGroup = async () => {
    if (!groupId || !groupMessage.trim()) return;
    try {
      await sendGroup({ groupId, content: groupMessage.trim(), contentType: "text" }).unwrap();
      setGroupMessage("");
      refetchGroupMessages();
      refetchGroups();
    } catch {
      toast.error("Failed", "Could not send group message.");
    }
  };

  const uploadAndSendMedia = async (file: File, target: "direct" | "group") => {
    if (target === "direct" && !threadUserId) return;
    if (target === "group" && !groupId) return;

    const resolvedType = file.type.startsWith("video/") ? "video" : "image";
    const safeName = `${Date.now()}-${file.name.replace(/\\s+/g, "-")}`;
    try {
      setIsUploadingMedia(true);
      const presign = await createMediaUploadUrl({
        folder: "messages",
        fileName: safeName,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }).unwrap();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed."));
        };
        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.open("PUT", presign.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      if (target === "direct" && threadUserId) {
        await sendDirect({
          userId: threadUserId,
          content: directMessage.trim() || undefined,
          contentType: resolvedType,
          mediaUrl: presign.publicUrl,
        }).unwrap();
        setDirectMessage("");
        refetchDirectMessages();
        refetchThreads();
      }

      if (target === "group" && groupId) {
        await sendGroup({
          groupId,
          content: groupMessage.trim() || undefined,
          contentType: resolvedType,
          mediaUrl: presign.publicUrl,
        }).unwrap();
        setGroupMessage("");
        refetchGroupMessages();
        refetchGroups();
      }
    } catch {
      toast.error("Failed", "Could not upload media.");
    } finally {
      setIsUploadingMedia(false);
      setActiveUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openFilePicker = (target: "direct" | "group", accept: string) => {
    setActiveUploadTarget(target);
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const openGifPicker = (target: "direct" | "group") => {
    setGifTarget(target);
    setGifQuery("");
    setGifDialogOpen(true);
    void searchGif("");
  };

  const searchGif = async (query: string) => {
    const cleanQuery = query.trim();
    setGifLoading(true);
    try {
      const response = await fetch(`/api/giphy/search?q=${encodeURIComponent(cleanQuery)}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as GifApiResponse | null;
      if (!response.ok) {
        setGifResults([]);
        toast.error("GIF search unavailable", payload?.error ?? "Could not load GIFs right now.");
        return;
      }
      const items = Array.isArray(payload?.results) ? payload.results : [];
      setGifResults(items);
    } catch {
      setGifResults([]);
      toast.error("GIF search unavailable", "Could not load GIFs right now.");
    } finally {
      setGifLoading(false);
    }
  };

  const sendGif = async (gifUrl: string) => {
    if (!gifTarget) return;
    try {
      if (gifTarget === "direct" && threadUserId) {
        await sendDirect({
          userId: threadUserId,
          content: directMessage.trim() || undefined,
          contentType: "image",
          mediaUrl: gifUrl,
        }).unwrap();
        setDirectMessage("");
        refetchDirectMessages();
        refetchThreads();
      }
      if (gifTarget === "group" && groupId) {
        await sendGroup({
          groupId,
          content: groupMessage.trim() || undefined,
          contentType: "image",
          mediaUrl: gifUrl,
        }).unwrap();
        setGroupMessage("");
        refetchGroupMessages();
        refetchGroups();
      }
      setGifDialogOpen(false);
      setGifTarget(null);
    } catch {
      toast.error("Failed", "Could not send GIF.");
    }
  };

  const handleDirectReaction = async (messageId: number, emoji: string) => {
    try {
      console.log("[Messaging][DirectReaction] request", { messageId, emoji });
      const result = await toggleDirectReaction({ messageId, emoji }).unwrap();
      console.log("[Messaging][DirectReaction] response", result);
      if (Array.isArray(result?.reactions)) {
        setDirectReactionOverrides((current) => ({
          ...current,
          [messageId]: result.reactions as ChatReaction[],
        }));
      }
      refetchDirectMessages();
    } catch (error) {
      console.error("[Messaging][DirectReaction] error", { messageId, emoji, error });
      toast.error("Failed", "Could not update reaction.");
    }
  };

  const handleGroupReaction = async (messageId: number, emoji: string) => {
    if (!groupId) return;
    try {
      console.log("[Messaging][GroupReaction] request", { groupId, messageId, emoji });
      const result = await toggleGroupReaction({ groupId, messageId, emoji }).unwrap();
      console.log("[Messaging][GroupReaction] response", result);
      if (Array.isArray(result?.reactions)) {
        setGroupReactionOverrides((current) => ({
          ...current,
          [messageId]: result.reactions as ChatReaction[],
        }));
      }
      refetchGroupMessages();
    } catch (error) {
      console.error("[Messaging][GroupReaction] error", { groupId, messageId, emoji, error });
      toast.error("Failed", "Could not update reaction.");
    }
  };

  const handleCreateGroup = async () => {
    if (!selectedTeamName.trim()) return;
    try {
      const teamResponse = await fetch(`/api/backend/admin/teams/${encodeURIComponent(selectedTeamName)}`, {
        credentials: "include",
      });
      const teamPayload = (await teamResponse.json().catch(() => ({}))) as AdminTeamDetails;
      if (!teamResponse.ok) {
        throw new Error("Failed to load selected team details.");
      }

      const teamGuardianEmails = new Set(
        (teamPayload?.members ?? [])
          .map((member) => String(member.guardianEmail ?? "").trim().toLowerCase())
          .filter(Boolean),
      );

      const memberIds = chatEligibleUsers
        .filter((user) => teamGuardianEmails.has(String(user.email ?? "").trim().toLowerCase()))
        .map((user) => Number(user.id))
        .filter((id) => Number.isFinite(id));

      if (!memberIds.length) {
        throw new Error("No chat users found for this team.");
      }

      const response = await createGroup({
        name: newGroupName.trim() || selectedTeamName.trim(),
        memberIds: [...new Set(memberIds)],
      }).unwrap();
      setGroupModalOpen(false);
      setNewGroupName("");
      setSelectedTeamName("");
      refetchGroups();
      if (response?.group?.id) {
        setGroupId(response.group.id);
      }
      toast.success("Group created", "You can now message this team group.");
    } catch {
      toast.error("Failed", "Could not create group.");
    }
  };

  return (
    <AdminShell
      title="Messaging"
      subtitle="Announcements, inbox messaging, team groups, and communication stats."
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="announcement" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcement
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" /> Teams
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcement">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Send Announcement"
                  description="Broadcast to all users from one place."
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Announcement title"
                  value={announcementTitle}
                  onChange={(event) => setAnnouncementTitle(event.target.value)}
                />
                <Textarea
                  placeholder="Write announcement message"
                  value={announcementBody}
                  onChange={(event) => setAnnouncementBody(event.target.value)}
                  className="min-h-40"
                />
                <Button
                  onClick={() => void handleCreateAnnouncement()}
                  disabled={isCreatingAnnouncement || !announcementTitle.trim() || !announcementBody.trim()}
                >
                  {isCreatingAnnouncement ? "Sending..." : "Send announcement"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent announcements</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[430px] pr-3">
                  <div className="space-y-3">
                    {announcements.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{item.body}</p>
                      </div>
                    ))}
                    {!announcements.length ? (
                      <p className="text-sm text-muted-foreground">No announcements yet.</p>
                    ) : null}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inbox">
          <div className="mx-auto w-full max-w-7xl">
          <Card className="min-h-[78vh]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <SectionHeader
                  title="Inbox"
                  description="Open a user thread to chat individually in a focused modal."
                />
                <Button size="sm" variant="outline" onClick={() => setGroupModalOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Create group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[68vh] pr-3">
                <div className="space-y-2">
                  {threads.map((thread) => (
                    <button
                      key={thread.userId}
                      type="button"
                      onClick={() => void openDirectThread(thread.userId)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{thread.name}</p>
                        <div className="flex items-center gap-2">
                          {thread.unread > 0 ? <Badge variant="primary">{thread.unread}</Badge> : null}
                          <span className="text-xs text-muted-foreground">{formatTime(thread.updatedAt)}</span>
                        </div>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{thread.preview}</p>
                    </button>
                  ))}
                  {!threads.length ? <p className="text-sm text-muted-foreground">Inbox is empty.</p> : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <SectionHeader
                    title="Team chats"
                    description="Open a team thread in modal and chat with group members."
                  />
                  <Button size="sm" variant="outline" onClick={() => setGroupModalOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> New group
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[460px] pr-3">
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setGroupId(group.id)}
                        className="w-full rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <p className="text-sm font-semibold text-foreground">{group.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Created {formatTime(group.createdAt)}</p>
                      </button>
                    ))}
                    {!groups.length ? <p className="text-sm text-muted-foreground">No team groups yet.</p> : null}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{stats.totalAnnouncements}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Inbox threads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{stats.totalThreads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Unread messages</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{stats.unreadThreads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Team groups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{stats.totalGroups}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={threadUserId != null} onOpenChange={(open) => (open ? null : setThreadUserId(null))}>
        <DialogContent className="max-h-[92vh] w-[96vw] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{directThreadName || "Conversation"}</DialogTitle>
            <DialogDescription>Direct message thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ThreadMessageList
              messages={directMessages}
              onReact={handleDirectReaction}
              formatTime={formatTime}
              currentUserId={currentUserId}
              resolveUserName={resolveUserName}
              mode="direct"
              directPeerUserId={threadUserId}
              directPeerName={directThreadName}
              emptyLabel="No messages yet."
            />
            <ChatComposer
              value={directMessage}
              onChange={setDirectMessage}
              placeholder="Type a message..."
              onSend={() => void handleSendDirect()}
              canSend={Boolean(threadUserId && directMessage.trim())}
              isSending={isSendingDirect}
              isUploading={isUploadingMedia}
              onPickPhoto={() => openFilePicker("direct", "image/*")}
              onPickVideo={() => openFilePicker("direct", "video/*")}
              onPickGif={() => openGifPicker("direct")}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupId != null} onOpenChange={(open) => (open ? null : setGroupId(null))}>
        <DialogContent className="max-h-[92vh] w-[96vw] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{groups.find((group) => group.id === groupId)?.name ?? "Team chat"}</DialogTitle>
            <DialogDescription>Group thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ThreadMessageList
              messages={groupMessages}
              onReact={handleGroupReaction}
              formatTime={formatTime}
              currentUserId={currentUserId}
              resolveUserName={resolveUserName}
              mode="group"
              showSenderName
              emptyLabel="No group messages yet."
            />
            <ChatComposer
              value={groupMessage}
              onChange={setGroupMessage}
              placeholder="Type a team message..."
              onSend={() => void handleSendGroup()}
              canSend={Boolean(groupId && groupMessage.trim())}
              isSending={isSendingGroup}
              isUploading={isUploadingMedia}
              onPickPhoto={() => openFilePicker("group", "image/*")}
              onPickVideo={() => openFilePicker("group", "video/*")}
              onPickGif={() => openGifPicker("group")}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create team group</DialogTitle>
            <DialogDescription>Select an admin-created team and create a group from its members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Group name (optional)"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
            />
            <Select value={selectedTeamName} onChange={(event) => setSelectedTeamName(event.target.value)}>
              <option value="">Select team</option>
              {adminTeams.map((team) => (
                <option key={team.team} value={team.team}>
                  {team.team}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {isLoadingTeams
                ? "Loading admin-created teams..."
                : `Teams available: ${adminTeams.length}`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGroupModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreateGroup()}
                disabled={isCreatingGroup || !selectedTeamName.trim()}
              >
                {isCreatingGroup ? "Creating..." : "Create group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TenorPickerDialog
        open={gifDialogOpen}
        onOpenChange={setGifDialogOpen}
        query={gifQuery}
        onQueryChange={setGifQuery}
        onSearch={searchGif}
        results={gifResults}
        loading={gifLoading}
        onSelectGif={sendGif}
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file || !activeUploadTarget) return;
          void uploadAndSendMedia(file, activeUploadTarget);
        }}
      />
    </AdminShell>
  );
}

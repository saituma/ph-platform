"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { skipToken } from "@reduxjs/toolkit/query";
import { MessageCircle, Megaphone, Send, Users2, BarChart3, Plus, Smile } from "lucide-react";
import { useMemo, useState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import {
  useCreateChatGroupMutation,
  useCreateContentMutation,
  useGetAnnouncementsQuery,
  useGetChatGroupMessagesQuery,
  useGetChatGroupsQuery,
  useGetMessagesQuery,
  useGetThreadsQuery,
  useGetUsersQuery,
  useMarkThreadReadMutation,
  useSendChatGroupMessageMutation,
  useSendMessageMutation,
} from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type ThreadListItem = {
  userId: number;
  name: string;
  preview: string;
  unread: number;
  updatedAt: string;
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
  const [showDirectEmoji, setShowDirectEmoji] = useState(false);
  const [showGroupEmoji, setShowGroupEmoji] = useState(false);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const { data: announcementsData, refetch: refetchAnnouncements } = useGetAnnouncementsQuery();
  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: groupsData, refetch: refetchGroups } = useGetChatGroupsQuery();

  const { data: directMessagesData, refetch: refetchDirectMessages } = useGetMessagesQuery(threadUserId ?? skipToken);
  const { data: groupMessagesData, refetch: refetchGroupMessages } = useGetChatGroupMessagesQuery(groupId ?? skipToken);

  const [createAnnouncement, { isLoading: isCreatingAnnouncement }] = useCreateContentMutation();
  const [markThreadRead] = useMarkThreadReadMutation();
  const [sendDirect, { isLoading: isSendingDirect }] = useSendMessageMutation();
  const [sendGroup, { isLoading: isSendingGroup }] = useSendChatGroupMessageMutation();
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateChatGroupMutation();

  const users = useMemo(() => usersData?.users ?? [], [usersData]);

  const chatEligibleUsers = useMemo(
    () => users.filter((user: any) => user?.role !== "admin" && user?.role !== "superAdmin" && user?.role !== "coach"),
    [users],
  );

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    chatEligibleUsers.forEach((user: any) => {
      map.set(user.id, user.name || user.email || `User ${user.id}`);
    });
    return map;
  }, [chatEligibleUsers]);

  const threads = useMemo<ThreadListItem[]>(() => {
    const source = threadsData?.threads ?? [];
    const byUserId = new Map<number, any>();
    source.forEach((thread: any) => {
      byUserId.set(Number(thread.userId), thread);
    });

    return chatEligibleUsers
      .map((user: any) => {
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

  const groups = useMemo(() => groupsData?.groups ?? [], [groupsData]);
  const announcements = useMemo(() => announcementsData?.items ?? [], [announcementsData]);

  const directThreadName = useMemo(() => {
    if (!threadUserId) return "";
    return userNameById.get(threadUserId) ?? `User ${threadUserId}`;
  }, [threadUserId, userNameById]);

  const stats = useMemo(() => {
    const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);
    return {
      totalAnnouncements: announcements.length,
      totalThreads: threads.length,
      unreadThreads: unread,
      totalGroups: groups.length,
    };
  }, [announcements.length, groups.length, threads]);

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
    } catch (error) {
      toast.error("Failed", "Could not publish announcement.");
    }
  };

  const openDirectThread = async (userId: number) => {
    setThreadUserId(userId);
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
      setShowDirectEmoji(false);
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
      setShowGroupEmoji(false);
      refetchGroupMessages();
      refetchGroups();
    } catch {
      toast.error("Failed", "Could not send group message.");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0) return;
    try {
      const response = await createGroup({ name: newGroupName.trim(), memberIds: selectedMemberIds }).unwrap();
      setGroupModalOpen(false);
      setNewGroupName("");
      setSelectedMemberIds([]);
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
                    {announcements.map((item: any) => (
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
          <Card>
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
              <ScrollArea className="h-[520px] pr-3">
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
        </TabsContent>

        <TabsContent value="teams">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
                    {groups.map((group: any) => (
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create team group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                />
                <ScrollArea className="h-[300px] rounded-xl border border-border p-3">
                  <div className="space-y-2">
                    {chatEligibleUsers.map((user: any) => {
                      const checked = selectedMemberIds.includes(user.id);
                      return (
                        <label key={user.id} className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setSelectedMemberIds((current) =>
                                event.target.checked
                                  ? [...current, user.id]
                                  : current.filter((id) => id !== user.id)
                              );
                            }}
                          />
                          <span>{user.name || user.email || `User ${user.id}`}</span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
                <Button
                  onClick={() => void handleCreateGroup()}
                  disabled={isCreatingGroup || !newGroupName.trim() || selectedMemberIds.length === 0}
                >
                  {isCreatingGroup ? "Creating..." : "Create group"}
                </Button>
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
        <DialogContent className="max-h-[85vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{directThreadName || "Conversation"}</DialogTitle>
            <DialogDescription>Direct message thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ScrollArea className="h-[420px] rounded-xl border border-border p-3">
              <div className="space-y-3">
                {(directMessagesData?.messages ?? []).map((message: any) => {
                  const mine = message?.senderRole === "admin" || message?.senderRole === "coach";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content || ""}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {!(directMessagesData?.messages ?? []).length ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : null}
              </div>
            </ScrollArea>
            <div className="rounded-xl border border-border p-3">
              <Textarea
                value={directMessage}
                onChange={(event) => setDirectMessage(event.target.value)}
                placeholder="Type a message..."
                className="min-h-24"
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowDirectEmoji((current) => !current)}>
                    <Smile className="mr-1.5 h-4 w-4" /> Emoji
                  </Button>
                  {showDirectEmoji ? (
                    <div className="absolute bottom-11 left-0 z-30">
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: any) => setDirectMessage((current) => `${current}${emoji?.native ?? ""}`)}
                        theme="light"
                        previewPosition="none"
                        searchPosition="none"
                        skinTonePosition="none"
                      />
                    </div>
                  ) : null}
                </div>
                <Button onClick={() => void handleSendDirect()} disabled={isSendingDirect || !directMessage.trim() || !threadUserId}>
                  <Send className="mr-1.5 h-4 w-4" /> {isSendingDirect ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupId != null} onOpenChange={(open) => (open ? null : setGroupId(null))}>
        <DialogContent className="max-h-[85vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{groups.find((group: any) => group.id === groupId)?.name ?? "Team chat"}</DialogTitle>
            <DialogDescription>Group thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ScrollArea className="h-[420px] rounded-xl border border-border p-3">
              <div className="space-y-3">
                {(groupMessagesData?.messages ?? []).map((message: any) => {
                  const mine = message?.senderRole === "admin" || message?.senderRole === "coach";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        <p className="text-xs opacity-80">{message.senderName ?? "Member"}</p>
                        <p className="text-sm whitespace-pre-wrap">{message.content || ""}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {!(groupMessagesData?.messages ?? []).length ? (
                  <p className="text-sm text-muted-foreground">No group messages yet.</p>
                ) : null}
              </div>
            </ScrollArea>
            <div className="rounded-xl border border-border p-3">
              <Textarea
                value={groupMessage}
                onChange={(event) => setGroupMessage(event.target.value)}
                placeholder="Type a team message..."
                className="min-h-24"
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowGroupEmoji((current) => !current)}>
                    <Smile className="mr-1.5 h-4 w-4" /> Emoji
                  </Button>
                  {showGroupEmoji ? (
                    <div className="absolute bottom-11 left-0 z-30">
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: any) => setGroupMessage((current) => `${current}${emoji?.native ?? ""}`)}
                        theme="light"
                        previewPosition="none"
                        searchPosition="none"
                        skinTonePosition="none"
                      />
                    </div>
                  ) : null}
                </div>
                <Button onClick={() => void handleSendGroup()} disabled={isSendingGroup || !groupMessage.trim() || !groupId}>
                  <Send className="mr-1.5 h-4 w-4" /> {isSendingGroup ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
            <DialogDescription>Select users and create a new inbox group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
            />
            <ScrollArea className="h-64 rounded-xl border border-border p-3">
              <div className="space-y-2">
                {chatEligibleUsers.map((user: any) => {
                  const checked = selectedMemberIds.includes(user.id);
                  return (
                    <label key={user.id} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setSelectedMemberIds((current) =>
                            event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id)
                          );
                        }}
                      />
                      <span>{user.name || user.email || `User ${user.id}`}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGroupModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreateGroup()}
                disabled={isCreatingGroup || !newGroupName.trim() || selectedMemberIds.length === 0}
              >
                {isCreatingGroup ? "Creating..." : "Create group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { BarChart3, MessageCircle, Megaphone, Users2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ChatComposer } from "../../components/admin/messaging/chat-composer";
import { InboxThreadPanel } from "../../components/admin/messaging/inbox-thread-panel";
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
  useAddChatGroupMembersMutation,
  useCreateChatGroupMutation,
  useCreateContentMutation,
  useCreateMediaUploadUrlMutation,
  useGetAdminTeamsQuery,
  useGetAdminProfileQuery,
  useGetAnnouncementsQuery,
  useGetChatGroupMembersQuery,
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
  isPremium: boolean;
  tierLabel: string | null;
};

type AdminTeamItem = {
  team: string;
  memberCount: number;
  guardianCount: number;
  createdAt: string;
  updatedAt: string;
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

function getTierFromUser(user: MessagingUser) {
  return user.programTier ?? user.currentProgramTier ?? user.desiredProgramType ?? null;
}

function isPremiumTier(tier: string | null) {
  if (!tier) return false;
  return tier.toLowerCase().includes("premium");
}

function resolveGroupCategory(group: Pick<ChatGroupItem, "category" | "name">): "announcement" | "coach_group" | "team" {
  if (group.category === "announcement" || group.category === "coach_group" || group.category === "team") {
    return group.category;
  }
  const normalized = String(group.name ?? "").trim().toLowerCase();
  if (/(announce|announcement|broadcast)/i.test(normalized)) return "announcement";
  if (/(team|squad|club)/i.test(normalized)) return "team";
  return "coach_group";
}

function categoryLabel(category: "announcement" | "coach_group" | "team") {
  if (category === "announcement") return "Coach announcements";
  if (category === "team") return "Team inbox";
  return "Coach groups";
}

export default function MessagingPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("inbox");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementAudienceType, setAnnouncementAudienceType] = useState<"all" | "age" | "team" | "group">("all");
  const [announcementAudienceAge, setAnnouncementAudienceAge] = useState("");
  const [announcementAudienceTeam, setAnnouncementAudienceTeam] = useState("");
  const [announcementAudienceGroupId, setAnnouncementAudienceGroupId] = useState("");

  const [threadUserId, setThreadUserId] = useState<number | null>(null);
  const [highlightedInboxThreadUserId, setHighlightedInboxThreadUserId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const [directMessage, setDirectMessage] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [directReplyTo, setDirectReplyTo] = useState<{ messageId: number; preview: string } | null>(null);
  const [groupReplyTo, setGroupReplyTo] = useState<{ messageId: number; preview: string } | null>(null);
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
  const [newGroupCategory, setNewGroupCategory] = useState<"announcement" | "coach_group" | "team">("coach_group");
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [manageGroupMembersOpen, setManageGroupMembersOpen] = useState(false);
  const [manageGroupId, setManageGroupId] = useState<number | null>(null);
  const [manageMemberQuery, setManageMemberQuery] = useState("");
  const [manageSelectedMemberIds, setManageSelectedMemberIds] = useState<number[]>([]);
  const [directReactionOverrides, setDirectReactionOverrides] = useState<Record<number, ChatReaction[]>>({});
  const [groupReactionOverrides, setGroupReactionOverrides] = useState<Record<number, ChatReaction[]>>({});
  const [highlightedTeamName, setHighlightedTeamName] = useState<string | null>(null);
  const [highlightedInboxGroupId, setHighlightedInboxGroupId] = useState<number | null>(null);
  const groupRowRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const { data: announcementsData, refetch: refetchAnnouncements } = useGetAnnouncementsQuery();
  const { data: adminProfileData } = useGetAdminProfileQuery();
  const { data: threadsData, refetch: refetchThreads } = useGetThreadsQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: adminTeamsData } = useGetAdminTeamsQuery();
  const { data: groupsData, refetch: refetchGroups } = useGetChatGroupsQuery();

  const { data: directMessagesData, refetch: refetchDirectMessages } = useGetMessagesQuery(threadUserId ?? skipToken);
  const { data: groupMessagesData, refetch: refetchGroupMessages } = useGetChatGroupMessagesQuery(groupId ?? skipToken);
  const { data: groupMembersData } = useGetChatGroupMembersQuery(manageGroupId ?? skipToken);

  const [createAnnouncement, { isLoading: isCreatingAnnouncement }] = useCreateContentMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();
  const [markThreadRead] = useMarkThreadReadMutation();
  const [sendDirect, { isLoading: isSendingDirect }] = useSendMessageMutation();
  const [sendGroup, { isLoading: isSendingGroup }] = useSendChatGroupMessageMutation();
  const [addChatGroupMembers, { isLoading: isAddingGroupMembers }] = useAddChatGroupMembersMutation();
  const [toggleDirectReaction] = useToggleMessageReactionMutation();
  const [toggleGroupReaction] = useToggleChatGroupMessageReactionMutation();
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateChatGroupMutation();

  const users = useMemo<MessagingUser[]>(() => (usersData?.users as MessagingUser[] | undefined) ?? [], [usersData]);

  const chatEligibleUsers = useMemo(
    () => users.filter((user) => user?.role !== "admin" && user?.role !== "superAdmin" && user?.role !== "coach"),
    [users],
  );

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
        const tier = getTierFromUser(user);
        return {
          userId: user.id,
          name: userNameById.get(user.id) ?? user.name ?? user.email ?? `User ${user.id}`,
          preview: thread?.preview ?? "Start a conversation",
          unread: Number(thread?.unread ?? 0),
          updatedAt: thread?.time ?? "",
          isPremium: isPremiumTier(tier),
          tierLabel: tier,
        };
      })
      .sort((a, b) => {
        if (Number(b.isPremium) !== Number(a.isPremium)) return Number(b.isPremium) - Number(a.isPremium);
        if (b.unread !== a.unread) return b.unread - a.unread;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [chatEligibleUsers, threadsData, userNameById]);

  const groups = useMemo<ChatGroupItem[]>(() => (groupsData?.groups as ChatGroupItem[] | undefined) ?? [], [groupsData]);
  const groupedInboxSections = useMemo(
    () => ({
      announcements: groups
        .filter((group) => resolveGroupCategory(group) === "announcement")
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
      coachGroups: groups
        .filter((group) => resolveGroupCategory(group) === "coach_group")
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
      teamInbox: groups
        .filter((group) => resolveGroupCategory(group) === "team")
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    }),
    [groups],
  );
  const teams = useMemo<AdminTeamItem[]>(() => adminTeamsData?.teams ?? [], [adminTeamsData]);
  const announcements = useMemo<AnnouncementItem[]>(
    () => (announcementsData?.items as AnnouncementItem[] | undefined) ?? [],
    [announcementsData],
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["announcement", "inbox", "teams", "stats"].includes(tabParam)) {
      setTab(tabParam);
    }

    const userIdParam = Number(searchParams.get("userId"));
    if (Number.isFinite(userIdParam) && userIdParam > 0) {
      const exists = chatEligibleUsers.some((user) => user.id === userIdParam);
      if (exists) {
        setTab("inbox");
        setGroupId(null);
        setHighlightedInboxThreadUserId(userIdParam);
        setThreadUserId(userIdParam);
      }
    }

    const groupIdParam = Number(searchParams.get("groupId"));
    if (Number.isFinite(groupIdParam) && groupIdParam > 0) {
      const exists = groups.some((group) => group.id === groupIdParam);
      if (exists) {
        setTab("inbox");
        setThreadUserId(null);
        setHighlightedInboxGroupId(groupIdParam);
        setGroupId(groupIdParam);
      }
    }

    const teamParam = (searchParams.get("team") ?? "").trim();
    if (teamParam) {
      setTab("teams");
      setHighlightedTeamName(teamParam.toLowerCase());
    } else {
      setHighlightedTeamName(null);
    }
  }, [searchParams, chatEligibleUsers, groups]);

  useEffect(() => {
    if (tab !== "inbox" || !highlightedInboxGroupId) return;
    const target = groupRowRefs.current[highlightedInboxGroupId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [tab, highlightedInboxGroupId]);

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
      totalTeams: teams.length,
      totalGroups: groups.length,
    };
  }, [announcements.length, groups.length, teams.length, threads]);

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

  const filteredGroupMembers = useMemo(() => {
    const query = groupMemberQuery.trim().toLowerCase();
    if (!query) return chatEligibleUsers;
    return chatEligibleUsers.filter((user) => {
      const name = String(user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [chatEligibleUsers, groupMemberQuery]);

  const existingManageMemberIds = useMemo<number[]>(
    () =>
      ((groupMembersData as { members?: Array<{ userId?: number | string }> } | undefined)?.members ?? [])
        .map((member) => Number(member.userId))
        .filter((id) => Number.isFinite(id)),
    [groupMembersData],
  );

  const filteredManageMembers = useMemo(() => {
    const query = manageMemberQuery.trim().toLowerCase();
    return chatEligibleUsers.filter((user) => {
      if (existingManageMemberIds.includes(user.id)) return false;
      if (!query) return true;
      const name = String(user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [chatEligibleUsers, existingManageMemberIds, manageMemberQuery]);

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    const parsedAudienceAge = Number(announcementAudienceAge);
    const parsedAudienceGroupId = Number(announcementAudienceGroupId);
    if (announcementAudienceType === "age" && !Number.isFinite(parsedAudienceAge)) {
      toast.error("Missing age", "Choose an age for this announcement audience.");
      return;
    }
    if (announcementAudienceType === "team" && !announcementAudienceTeam.trim()) {
      toast.error("Missing team", "Choose a team for this announcement audience.");
      return;
    }
    if (announcementAudienceType === "group" && !Number.isFinite(parsedAudienceGroupId)) {
      toast.error("Missing group", "Choose a group for this announcement audience.");
      return;
    }

    try {
      await createAnnouncement({
        title: announcementTitle.trim(),
        content: announcementTitle.trim(),
        body: announcementBody.trim(),
        type: "article",
        surface: "announcements",
        announcementAudienceType,
        announcementAudienceAge: announcementAudienceType === "age" ? parsedAudienceAge : undefined,
        announcementAudienceTeam: announcementAudienceType === "team" ? announcementAudienceTeam.trim() : undefined,
        announcementAudienceGroupId: announcementAudienceType === "group" ? parsedAudienceGroupId : undefined,
      }).unwrap();
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementAudienceType("all");
      setAnnouncementAudienceAge("");
      setAnnouncementAudienceTeam("");
      setAnnouncementAudienceGroupId("");
      refetchAnnouncements();
      toast.success("Announcement sent", "Your announcement is now visible to users.");
    } catch {
      toast.error("Failed", "Could not publish announcement.");
    }
  };

  const openDirectThread = async (userId: number) => {
    setThreadUserId(userId);
    setDirectReactionOverrides({});
    setDirectReplyTo(null);
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
      await sendDirect({
        userId: threadUserId,
        content: directMessage.trim(),
        contentType: "text",
        replyToMessageId: directReplyTo?.messageId,
        replyPreview: directReplyTo?.preview,
      }).unwrap();
      setDirectMessage("");
      setDirectReplyTo(null);
      refetchDirectMessages();
      refetchThreads();
    } catch {
      toast.error("Failed", "Could not send message.");
    }
  };

  const handleSendGroup = async () => {
    if (!groupId || !groupMessage.trim()) return;
    try {
      await sendGroup({
        groupId,
        content: groupMessage.trim(),
        contentType: "text",
        replyToMessageId: groupReplyTo?.messageId,
        replyPreview: groupReplyTo?.preview,
      }).unwrap();
      setGroupMessage("");
      setGroupReplyTo(null);
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
          replyToMessageId: directReplyTo?.messageId,
          replyPreview: directReplyTo?.preview,
        }).unwrap();
        setDirectMessage("");
        setDirectReplyTo(null);
        refetchDirectMessages();
        refetchThreads();
      }

      if (target === "group" && groupId) {
        await sendGroup({
          groupId,
          content: groupMessage.trim() || undefined,
          contentType: resolvedType,
          mediaUrl: presign.publicUrl,
          replyToMessageId: groupReplyTo?.messageId,
          replyPreview: groupReplyTo?.preview,
        }).unwrap();
        setGroupMessage("");
        setGroupReplyTo(null);
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
          replyToMessageId: directReplyTo?.messageId,
          replyPreview: directReplyTo?.preview,
        }).unwrap();
        setDirectMessage("");
        setDirectReplyTo(null);
        refetchDirectMessages();
        refetchThreads();
      }
      if (gifTarget === "group" && groupId) {
        await sendGroup({
          groupId,
          content: groupMessage.trim() || undefined,
          contentType: "image",
          mediaUrl: gifUrl,
          replyToMessageId: groupReplyTo?.messageId,
          replyPreview: groupReplyTo?.preview,
        }).unwrap();
        setGroupMessage("");
        setGroupReplyTo(null);
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
    if (!newGroupName.trim() || !selectedMemberIds.length) return;
    try {
      const response = await createGroup({
        name: newGroupName.trim(),
        category: newGroupCategory,
        memberIds: [...new Set(selectedMemberIds)],
      }).unwrap();
      setGroupModalOpen(false);
      setNewGroupName("");
      setNewGroupCategory("coach_group");
      setSelectedMemberIds([]);
      setGroupMemberQuery("");
      refetchGroups();
      if (response?.group?.id) {
        setGroupId(response.group.id);
      }
      toast.success("Group created", "You can now message this team group.");
    } catch {
      toast.error("Failed", "Could not create group.");
    }
  };

  const openManageGroupMembers = (targetGroupId: number) => {
    setManageGroupId(targetGroupId);
    setManageGroupMembersOpen(true);
    setManageSelectedMemberIds([]);
    setManageMemberQuery("");
  };

  const handleAddMembersToGroup = async () => {
    if (!manageGroupId || !manageSelectedMemberIds.length) return;
    try {
      await addChatGroupMembers({
        groupId: manageGroupId,
        memberIds: [...new Set(manageSelectedMemberIds)],
      }).unwrap();
      toast.success("Members added", "Selected members were added to the group.");
      setManageGroupMembersOpen(false);
      setManageSelectedMemberIds([]);
      setManageMemberQuery("");
    } catch {
      toast.error("Failed", "Could not add members to this group.");
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
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Audience type</p>
                    <Select
                      value={announcementAudienceType}
                      onChange={(event) =>
                        setAnnouncementAudienceType(event.target.value as "all" | "age" | "team" | "group")
                      }
                    >
                      <option value="all">All users</option>
                      <option value="age">Specific age</option>
                      <option value="team">Specific team</option>
                      <option value="group">Specific group</option>
                    </Select>
                  </div>
                  {announcementAudienceType === "age" ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Age</p>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="e.g. 7"
                        value={announcementAudienceAge}
                        onChange={(event) => setAnnouncementAudienceAge(event.target.value)}
                      />
                    </div>
                  ) : null}
                  {announcementAudienceType === "team" ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Team</p>
                      <Select
                        value={announcementAudienceTeam}
                        onChange={(event) => setAnnouncementAudienceTeam(event.target.value)}
                      >
                        <option value="">Choose a team</option>
                        {teams.map((team) => (
                          <option key={team.team} value={team.team}>
                            {team.team}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  {announcementAudienceType === "group" ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Group</p>
                      <Select
                        value={announcementAudienceGroupId}
                        onChange={(event) => setAnnouncementAudienceGroupId(event.target.value)}
                      >
                        <option value="">Choose a group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={String(group.id)}>
                            {group.name ?? `Group ${group.id}`}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                </div>
                <Textarea
                  placeholder="Write announcement message"
                  value={announcementBody}
                  onChange={(event) => setAnnouncementBody(event.target.value)}
                  className="min-h-40"
                />
                <Button
                  onClick={() => void handleCreateAnnouncement()}
                  disabled={
                    isCreatingAnnouncement ||
                    !announcementTitle.trim() ||
                    !announcementBody.trim() ||
                    (announcementAudienceType === "age" && !announcementAudienceAge) ||
                    (announcementAudienceType === "team" && !announcementAudienceTeam) ||
                    (announcementAudienceType === "group" && !announcementAudienceGroupId)
                  }
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
          <div className="space-y-4">
            <InboxThreadPanel
              threads={threads}
              highlightedUserId={highlightedInboxThreadUserId}
              onOpenThread={(userId) => {
                setHighlightedInboxThreadUserId(userId);
                void openDirectThread(userId);
              }}
              onCreateGroup={() => setGroupModalOpen(true)}
              formatTime={formatTime}
            />
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Group Chats"
                  description="Organized as coach announcements, coach groups, and team inbox."
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: "announcements", title: "Coach announcements", items: groupedInboxSections.announcements, tone: "bg-amber-500/10 text-amber-200 border-amber-500/30" },
                    { key: "coach-groups", title: "Coach groups", items: groupedInboxSections.coachGroups, tone: "bg-sky-500/10 text-sky-200 border-sky-500/30" },
                    { key: "team-inbox", title: "Team inbox", items: groupedInboxSections.teamInbox, tone: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30" },
                  ].map((section) => (
                    <div key={section.key} className="space-y-2">
                      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-background/95 py-1 backdrop-blur">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
                        <Badge variant="outline">{section.items.length}</Badge>
                      </div>
                      {section.items.map((group) => (
                        <button
                          key={group.id}
                          ref={(node) => {
                            groupRowRefs.current[group.id] = node;
                          }}
                          type="button"
                          onClick={() => {
                            setHighlightedInboxGroupId(group.id);
                            setGroupId(group.id);
                          }}
                          className={`group flex w-full items-center justify-between gap-3 rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 ${
                            highlightedInboxGroupId === group.id
                              ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
                              : "border-border"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${section.tone}`}>
                                {categoryLabel(resolveGroupCategory(group))}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Created {formatTime(group.createdAt)}</p>
                          </div>
                          <span className="text-xs text-muted-foreground transition group-hover:text-foreground">Open</span>
                        </button>
                      ))}
                      {!section.items.length ? (
                        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                          No {section.title.toLowerCase()}.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <SectionHeader
                title="Teams"
                description="Real athlete teams from onboarding and program data. This is separate from Inbox group chats."
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.team}
                    className={`rounded-xl border bg-background p-4 ${
                      highlightedTeamName && team.team.toLowerCase() === highlightedTeamName
                        ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{team.team}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {team.memberCount} athletes · {team.guardianCount} guardians
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Updated {formatTime(team.updatedAt)}</p>
                        <p>Created {formatTime(team.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!teams.length ? <p className="text-sm text-muted-foreground">No teams found.</p> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{stats.totalTeams}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Inbox groups</CardTitle>
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
              onReply={(payload) => setDirectReplyTo(payload)}
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
              replyingTo={directReplyTo ? { preview: directReplyTo.preview } : null}
              onCancelReply={() => setDirectReplyTo(null)}
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
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>{groups.find((group) => group.id === groupId)?.name ?? "Group chat"}</DialogTitle>
              {groupId ? (
                <Button size="sm" variant="outline" onClick={() => openManageGroupMembers(groupId)}>
                  Add member
                </Button>
              ) : null}
            </div>
            <DialogDescription>Group thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ThreadMessageList
              messages={groupMessages}
              onReact={handleGroupReaction}
              onReply={(payload) => setGroupReplyTo(payload)}
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
              replyingTo={groupReplyTo ? { preview: groupReplyTo.preview } : null}
              onCancelReply={() => setGroupReplyTo(null)}
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
            <DialogTitle>Create group</DialogTitle>
            <DialogDescription>Set a group name and choose members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Group type</p>
              <Select
                value={newGroupCategory}
                onChange={(event) =>
                  setNewGroupCategory(event.target.value as "announcement" | "coach_group" | "team")
                }
              >
                <option value="coach_group">Coach group</option>
                <option value="announcement">Coach announcement</option>
                <option value="team">Team inbox</option>
              </Select>
            </div>
            <Input
              placeholder="Search members..."
              value={groupMemberQuery}
              onChange={(event) => setGroupMemberQuery(event.target.value)}
            />
            <ScrollArea className="h-56 rounded-xl border border-border p-2">
              <div className="space-y-1">
                {filteredGroupMembers.map((user) => {
                  const selected = selectedMemberIds.includes(user.id);
                  const label = user.name ?? user.email ?? `User ${user.id}`;
                  return (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-secondary/40"
                    >
                      <span className="min-w-0 truncate text-sm">{label}</span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setSelectedMemberIds((current) =>
                            selected ? current.filter((id) => id !== user.id) : [...current, user.id],
                          )
                        }
                      />
                    </label>
                  );
                })}
                {!filteredGroupMembers.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No members found.</p>
                ) : null}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">{selectedMemberIds.length} members selected</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGroupModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreateGroup()}
                disabled={isCreatingGroup || !newGroupName.trim() || !selectedMemberIds.length}
              >
                {isCreatingGroup ? "Creating..." : "Create group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manageGroupMembersOpen} onOpenChange={setManageGroupMembersOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>
              {groups.find((group) => group.id === manageGroupId)?.name ?? "Group"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search members..."
              value={manageMemberQuery}
              onChange={(event) => setManageMemberQuery(event.target.value)}
            />
            <ScrollArea className="h-56 rounded-xl border border-border p-2">
              <div className="space-y-1">
                {filteredManageMembers.map((user) => {
                  const selected = manageSelectedMemberIds.includes(user.id);
                  const label = user.name ?? user.email ?? `User ${user.id}`;
                  return (
                    <label
                      key={`manage-${user.id}`}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-secondary/40"
                    >
                      <span className="min-w-0 truncate text-sm">{label}</span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setManageSelectedMemberIds((current) =>
                            selected ? current.filter((id) => id !== user.id) : [...current, user.id],
                          )
                        }
                      />
                    </label>
                  );
                })}
                {!filteredManageMembers.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No members available.</p>
                ) : null}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">{manageSelectedMemberIds.length} members selected</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManageGroupMembersOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleAddMembersToGroup()}
                disabled={isAddingGroupMembers || !manageSelectedMemberIds.length || !manageGroupId}
              >
                {isAddingGroupMembers ? "Adding..." : "Add members"}
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

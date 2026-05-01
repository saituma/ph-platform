"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { BarChart3, MessageCircle, Megaphone, Users2 } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";

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
} from "../../components/admin/messaging/types";
import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import {
  useAddChatGroupMembersMutation,
  useCreateChatGroupMutation,
  useCreateContentMutation,
  useCreateMediaUploadUrlMutation,
  useDeleteContentMutation,
  useGetAdminTeamsQuery,
  useGetAdminProfileQuery,
  useGetAnnouncementsQuery,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useGetMessagingInboxQuery,
  useGetMessagesQuery,
  useGetUsersQuery,
  useMarkChatGroupReadMutation,
  useMarkThreadReadMutation,
  useSendChatGroupMessageMutation,
  useSendMessageMutation,
  useToggleChatGroupMessageReactionMutation,
  useToggleMessageReactionMutation,
  useUpdateContentMutation,
} from "@/lib/apiSlice";
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
  youthCount: number;
  adultCount: number;
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
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSchedule(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) return "Permanent";
  if (startsAt && endsAt)
    return `Active ${formatTime(startsAt)} → ${formatTime(endsAt)}`;
  if (startsAt) return `Starts ${formatTime(startsAt)}`;
  return `Ends ${formatTime(endsAt)}`;
}

function getGroupActivityTimestamp(group: ChatGroupItem) {
  return group.lastMessage?.createdAt ?? group.createdAt ?? null;
}

function formatGroupLastMessagePreview(group: ChatGroupItem) {
  const message = group.lastMessage;
  if (!message) return "No messages yet";

  const sender = (message.senderName ?? "").trim();
  const content = (message.content ?? "").trim();
  const type = (message.contentType ?? "text").toString();
  const label =
    type === "image"
      ? "Photo"
      : type === "video"
        ? "Video"
        : content || "Message";
  if (!sender) return label;
  return `${sender}: ${label}`;
}

function getGroupLastSender(group: ChatGroupItem) {
  return String(group.lastMessage?.senderName ?? "").trim() || null;
}

function formatUnreadCount(unread: number) {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 99 ? "99+" : String(unread);
}

function isValidDateTimeValue(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function toLocalInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function getTierFromUser(user: MessagingUser) {
  return (
    user.programTier ??
    user.currentProgramTier ??
    user.desiredProgramType ??
    null
  );
}

function isPremiumTier(tier: string | null) {
  if (!tier) return false;
  return tier.toLowerCase().includes("premium");
}

function resolveGroupCategory(
  group: Pick<ChatGroupItem, "category" | "name">,
): "announcement" | "coach_group" | "team" {
  if (
    group.category === "announcement" ||
    group.category === "coach_group" ||
    group.category === "team"
  ) {
    return group.category;
  }
  const normalized = String(group.name ?? "")
    .trim()
    .toLowerCase();
  if (/(announce|announcement|broadcast)/i.test(normalized))
    return "announcement";
  if (/(team|squad|club)/i.test(normalized)) return "team";
  return "coach_group";
}

function categoryLabel(category: "announcement" | "coach_group" | "team") {
  if (category === "announcement") return "Coach announcements";
  if (category === "team") return "Team inbox";
  return "Coach groups";
}

function normalizeTeamKey(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function canonicalTeamMatchKey(value?: string | null) {
  const normalized = normalizeTeamKey(value);
  const stripped = normalized
    .replace(/\b(team|inbox|group|chat)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || normalized;
}

export default function MessagingPage() {
  return (
    <Suspense fallback={null}>
      <MessagingPageInner />
    </Suspense>
  );
}

function MessagingPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("inbox");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementAudienceType, setAnnouncementAudienceType] = useState<
    "all" | "youth" | "adult" | "team" | "group" | "tier"
  >("all");
  const [announcementAudienceTeam, setAnnouncementAudienceTeam] = useState("");
  const [announcementAudienceGroupId, setAnnouncementAudienceGroupId] =
    useState("");
  const [announcementAudienceTier, setAnnouncementAudienceTier] = useState("");
  const [announcementTimingType, setAnnouncementTimingType] = useState<
    "permanent" | "scheduled"
  >("permanent");
  const [announcementStartsAt, setAnnouncementStartsAt] = useState("");
  const [announcementEndsAt, setAnnouncementEndsAt] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    number | null
  >(null);
  const [editAnnouncementTitle, setEditAnnouncementTitle] = useState("");
  const [editAnnouncementBody, setEditAnnouncementBody] = useState("");
  const [editAnnouncementTimingType, setEditAnnouncementTimingType] = useState<
    "permanent" | "scheduled"
  >("permanent");
  const [editAnnouncementStartsAt, setEditAnnouncementStartsAt] = useState("");
  const [editAnnouncementEndsAt, setEditAnnouncementEndsAt] = useState("");
  const [editAnnouncementIsActive, setEditAnnouncementIsActive] =
    useState(true);

  const [threadUserId, setThreadUserId] = useState<number | null>(null);
  const [highlightedInboxThreadUserId, setHighlightedInboxThreadUserId] =
    useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const [directMessage, setDirectMessage] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [directReplyTo, setDirectReplyTo] = useState<{
    messageId: number;
    preview: string;
  } | null>(null);
  const [groupReplyTo, setGroupReplyTo] = useState<{
    messageId: number;
    preview: string;
  } | null>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<
    "direct" | "group" | null
  >(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [gifTarget, setGifTarget] = useState<"direct" | "group" | null>(null);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<
    Array<{ id: string; url: string; previewUrl: string }>
  >([]);
  const [gifLoading, setGifLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<
    number | null
  >(null);
  const [deleteAnnouncementTarget, setDeleteAnnouncementTarget] =
    useState<AnnouncementItem | null>(null);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState<
    "announcement" | "coach_group" | "team"
  >("coach_group");
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [manageGroupMembersOpen, setManageGroupMembersOpen] = useState(false);
  const [manageGroupId, setManageGroupId] = useState<number | null>(null);
  const [manageMemberQuery, setManageMemberQuery] = useState("");
  const [manageSelectedMemberIds, setManageSelectedMemberIds] = useState<
    number[]
  >([]);
  const [directReactionOverrides, setDirectReactionOverrides] = useState<
    Record<number, ChatReaction[]>
  >({});
  const [groupReactionOverrides, setGroupReactionOverrides] = useState<
    Record<number, ChatReaction[]>
  >({});
  const [highlightedTeamName, setHighlightedTeamName] = useState<string | null>(
    null,
  );
  const [highlightedInboxGroupId, setHighlightedInboxGroupId] = useState<
    number | null
  >(null);
  const groupRowRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const { data: announcementsData, refetch: refetchAnnouncements } =
    useGetAnnouncementsQuery();
  const { data: adminProfileData } = useGetAdminProfileQuery();
  const { data: inboxData, refetch: refetchInbox } = useGetMessagingInboxQuery({
    limit: 300,
    includeAdminThreads: true,
  });
  const { data: usersData } = useGetUsersQuery();
  const { data: adminTeamsData } = useGetAdminTeamsQuery();

  const { data: directMessagesData, refetch: refetchDirectMessages } =
    useGetMessagesQuery(threadUserId ?? skipToken);
  const { data: groupMessagesData, refetch: refetchGroupMessages } =
    useGetChatGroupMessagesQuery(groupId ?? skipToken);
  const { data: groupMembersData } = useGetChatGroupMembersQuery(
    manageGroupId ?? skipToken,
  );

  const socketRef = useRef<Socket | null>(null);
  const refetchThreadsRef = useRef(refetchInbox);
  const refetchGroupsRef = useRef(refetchInbox);
  const refetchDirectMessagesRef = useRef(refetchDirectMessages);
  const refetchGroupMessagesRef = useRef(refetchGroupMessages);
  const activeThreadUserIdRef = useRef<number | null>(threadUserId);
  const activeGroupIdRef = useRef<number | null>(groupId);
  const currentUserIdRef = useRef<number | null>(null);
  const isWindowFocusedRef = useRef(true);
  const lastNotifiedRef = useRef<{
    kind: "direct" | "group";
    id: string;
  } | null>(null);

  useEffect(() => {
    refetchThreadsRef.current = refetchInbox;
  }, [refetchInbox]);

  useEffect(() => {
    refetchGroupsRef.current = refetchInbox;
  }, [refetchInbox]);

  useEffect(() => {
    refetchDirectMessagesRef.current = refetchDirectMessages;
  }, [refetchDirectMessages]);

  useEffect(() => {
    refetchGroupMessagesRef.current = refetchGroupMessages;
  }, [refetchGroupMessages]);

  useEffect(() => {
    activeThreadUserIdRef.current = threadUserId;
  }, [threadUserId]);

  useEffect(() => {
    activeGroupIdRef.current = groupId;
  }, [groupId]);

  useEffect(() => {
    const onFocus = () => {
      isWindowFocusedRef.current = true;
    };
    const onBlur = () => {
      isWindowFocusedRef.current = false;
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    const socketEnvUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const apiEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const localDevHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const fallbackLocalUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    const socketUrl = socketEnvUrl
      ? socketEnvUrl.replace(/\/api\/?$/, "")
      : localDevHost
        ? fallbackLocalUrl
        : apiEnvUrl
          ? apiEnvUrl.replace(/\/api\/?$/, "")
          : fallbackLocalUrl;

    const accessToken =
      document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("accessTokenClient="))
        ?.split("=")[1] ?? "";

    const socket: Socket = io(socketUrl, {
      auth: accessToken ? { token: accessToken } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("[Messaging Socket] Connected"));

    const canShowBrowserNotification = () => {
      if (typeof window === "undefined") return false;
      if (typeof Notification === "undefined") return false;
      if (Notification.permission !== "granted") return false;
      const hidden = document.visibilityState !== "visible";
      const focused = isWindowFocusedRef.current;
      return hidden || !focused;
    };

    const safeTextPreview = (raw: unknown) => {
      const input = String(raw ?? "").trim();
      const stripped = input.replace(/^\s*\[reply:\d+:[^\]]*\]\s*/i, "").trim();
      return stripped || "New message";
    };

    const notifyBrowser = (params: {
      title: string;
      body: string;
      icon?: string | null;
      tag: string;
      url: string;
    }) => {
      if (!canShowBrowserNotification()) return;
      const prev = lastNotifiedRef.current;
      if (prev && prev.id === params.tag) return;
      lastNotifiedRef.current = {
        kind: params.tag.startsWith("group:") ? "group" : "direct",
        id: params.tag,
      };
      try {
        const notif = new Notification(params.title, {
          body: params.body,
          icon: params.icon ?? undefined,
          tag: params.tag,
        });
        notif.onclick = () => {
          try {
            window.focus();
          } catch {
            // ignored
          }
          window.location.assign(params.url);
          notif.close();
        };
      } catch {
        // ignored
      }
    };

    socket.on("message:new", (payload: any) => {
      refetchThreadsRef.current();
      const senderId = Number(payload?.senderId ?? NaN);
      const receiverId = Number(payload?.receiverId ?? NaN);
      const me = currentUserIdRef.current;
      if (me != null && Number.isFinite(senderId) && senderId === me) return;
      const threadUserId = Number.isFinite(senderId)
        ? senderId
        : Number.isFinite(receiverId)
          ? receiverId
          : null;
      if (!threadUserId) return;
      const title = payload?.senderName
        ? `New message from ${String(payload.senderName)}`
        : `New message from ${resolveUserName ? resolveUserName(threadUserId) : `User ${threadUserId}`}`;
      const body =
        String(payload?.contentType ?? "").toLowerCase() === "image"
          ? "Sent a photo"
          : String(payload?.contentType ?? "").toLowerCase() === "video"
            ? "Sent a video"
            : safeTextPreview(payload?.content);
      notifyBrowser({
        title,
        body,
        icon: payload?.senderProfilePicture ?? null,
        tag: `direct:${String(payload?.id ?? `${Date.now()}`)}`,
        url: `/messaging?tab=inbox&userId=${threadUserId}`,
      });
    });

    socket.on("group:message", (payload: any) => {
      refetchGroupsRef.current();
      refetchGroupMessagesRef.current();
      const groupId = Number(payload?.groupId ?? NaN);
      if (!Number.isFinite(groupId) || groupId <= 0) return;
      const senderId = Number(payload?.senderId ?? NaN);
      const me = currentUserIdRef.current;
      if (me != null && Number.isFinite(senderId) && senderId === me) return;
      const senderLabel =
        String(payload?.senderName ?? "").trim() ||
        (Number.isFinite(senderId) ? resolveUserName(senderId) : "New message");
      const groupLabel = String(payload?.groupName ?? "").trim() || "Group";
      const title = `${senderLabel} in ${groupLabel}`;
      const body =
        String(payload?.contentType ?? "").toLowerCase() === "image"
          ? "Sent a photo"
          : String(payload?.contentType ?? "").toLowerCase() === "video"
            ? "Sent a video"
            : safeTextPreview(payload?.content);
      notifyBrowser({
        title,
        body,
        icon: payload?.senderProfilePicture ?? null,
        tag: `group:${String(payload?.id ?? `${Date.now()}`)}`,
        url: `/messaging?tab=inbox&groupId=${groupId}`,
      });
    });

    socket.on("message:read", (payload: any) => {
      refetchThreadsRef.current();

      const activeThreadUserId = activeThreadUserIdRef.current;
      const currentUserId = currentUserIdRef.current;
      if (!activeThreadUserId || currentUserId == null) return;

      const readerUserId = Number(payload?.readerUserId ?? NaN);
      const peerUserIds = Array.isArray(payload?.peerUserIds)
        ? payload.peerUserIds
            .map((id: unknown) => Number(id))
            .filter((id: number) => Number.isFinite(id))
        : [];

      const involvesActiveThread =
        activeThreadUserId === readerUserId ||
        peerUserIds.includes(activeThreadUserId);
      const involvesCurrentUser =
        currentUserId === readerUserId || peerUserIds.includes(currentUserId);

      if (involvesActiveThread && involvesCurrentUser) {
        refetchDirectMessagesRef.current();
      }
    });

    socket.on("group:read", (payload: any) => {
      refetchGroupsRef.current();
      const activeGroupId = activeGroupIdRef.current;
      const payloadGroupId = Number(payload?.groupId ?? NaN);
      if (
        activeGroupId &&
        Number.isFinite(payloadGroupId) &&
        payloadGroupId === activeGroupId
      ) {
        refetchGroupMessagesRef.current();
      }
    });

    socket.on("message:reaction", (payload: any) => {
      const messageId = Number(payload?.messageId ?? NaN);
      if (!Number.isFinite(messageId)) return;
      if (Array.isArray(payload?.reactions)) {
        setDirectReactionOverrides((current) => ({
          ...current,
          [messageId]: payload.reactions as ChatReaction[],
        }));
      }
      refetchDirectMessagesRef.current();
    });

    socket.on("group:reaction", (payload: any) => {
      const payloadGroupId = Number(payload?.groupId ?? NaN);
      const messageId = Number(payload?.messageId ?? NaN);
      if (!Number.isFinite(payloadGroupId) || !Number.isFinite(messageId)) return;
      if (Array.isArray(payload?.reactions)) {
        setGroupReactionOverrides((current) => ({
          ...current,
          [messageId]: payload.reactions as ChatReaction[],
        }));
      }
      const activeGroupId = activeGroupIdRef.current;
      if (activeGroupId && payloadGroupId === activeGroupId) {
        refetchGroupMessagesRef.current();
      }
      refetchGroupsRef.current();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (!groupId) return;
    socket.emit("group:join", { groupId });
    return () => {
      socket.emit("group:leave", { groupId });
    };
  }, [groupId]);

  const [createAnnouncement, { isLoading: isCreatingAnnouncement }] =
    useCreateContentMutation();
  const [updateAnnouncement, { isLoading: isUpdatingAnnouncement }] =
    useUpdateContentMutation();
  const [deleteAnnouncement] = useDeleteContentMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();
  const [markThreadRead] = useMarkThreadReadMutation();
  const [markChatGroupRead] = useMarkChatGroupReadMutation();
  const [sendDirect, { isLoading: isSendingDirect }] = useSendMessageMutation();
  const [sendGroup, { isLoading: isSendingGroup }] =
    useSendChatGroupMessageMutation();
  const [addChatGroupMembers, { isLoading: isAddingGroupMembers }] =
    useAddChatGroupMembersMutation();
  const [toggleDirectReaction] = useToggleMessageReactionMutation();
  const [toggleGroupReaction] = useToggleChatGroupMessageReactionMutation();
  const [createGroup, { isLoading: isCreatingGroup }] =
    useCreateChatGroupMutation();

  const users = useMemo<MessagingUser[]>(
    () => (usersData?.users as MessagingUser[] | undefined) ?? [],
    [usersData],
  );

  const chatEligibleUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user?.role !== "admin" &&
          user?.role !== "superAdmin" &&
          user?.role !== "coach",
      ),
    [users],
  );

  useEffect(() => {
    if (groupId == null) {
      setGroupReactionOverrides({});
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId == null) return;
    let active = true;
    (async () => {
      try {
        await markChatGroupRead({ groupId }).unwrap();
        if (!active) return;
        refetchInbox();
      } catch {
        // keep opening modal even if mark-read fails
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId, markChatGroupRead, refetchInbox]);

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

  const inboxThreads = useMemo<any[]>(
    () => (inboxData?.threads as any[] | undefined) ?? [],
    [inboxData],
  );

  const threads = useMemo<ThreadListItem[]>(() => {
    return inboxThreads
      .filter((thread) => thread?.type === "direct")
      .map((thread) => {
        const userId = Number(thread.peerUserId ?? String(thread.id ?? "").replace(/^direct:/, ""));
        const user = chatEligibleUsers.find((candidate) => candidate.id === userId);
        const tier = getTierFromUser(user ?? ({} as MessagingUser));
        return {
          userId,
          name:
            String(thread.name ?? "").trim() ||
            userNameById.get(userId) ||
            user?.name ||
            user?.email ||
            `User ${userId}`,
          preview: String(thread.preview ?? "Start a conversation"),
          unread: Number(thread.unread ?? 0) || 0,
          updatedAt: String(thread.updatedAt ?? ""),
          isPremium: isPremiumTier(tier),
          tierLabel: tier,
        };
      })
      .filter((thread) => Number.isFinite(thread.userId) && thread.userId > 0)
      .sort((a, b) => {
        if (Number(b.isPremium) !== Number(a.isPremium))
          return Number(b.isPremium) - Number(a.isPremium);
        if (b.unread !== a.unread) return b.unread - a.unread;
        return (
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
        );
      });
  }, [chatEligibleUsers, inboxThreads, userNameById]);

  const groups = useMemo<ChatGroupItem[]>(
    () =>
      inboxThreads
        .filter((thread) => thread?.type === "group")
        .map((thread) => ({
          id: Number(thread.groupId ?? String(thread.id ?? "").replace(/^group:/, "")),
          name: String(thread.name ?? "Group"),
          category: (thread.groupCategory as "announcement" | "coach_group" | "team" | null) ?? "coach_group",
          createdAt: String(
            thread.lastMessageCreatedAt ?? thread.updatedAt ?? new Date(0).toISOString(),
          ),
          unreadCount: Number(thread.unread ?? 0) || 0,
          lastMessage: {
            id: String(
              thread.lastMessageId ??
                `${String(thread.groupId ?? "").trim()}:latest`,
            ),
            senderId:
              Number(thread.lastMessageSenderId ?? NaN) > 0
                ? Number(thread.lastMessageSenderId)
                : null,
            senderName:
              String(thread.lastMessageSenderName ?? "").trim() || null,
            senderProfilePicture: thread.lastMessageSenderProfilePicture ?? null,
            content: String(
              thread.lastMessageContent ??
                thread.preview ??
                "No messages yet",
            ),
            contentType: String(thread.lastMessageContentType ?? "text"),
            mediaUrl: null,
            createdAt: String(
              thread.lastMessageCreatedAt ??
                thread.updatedAt ??
                new Date(0).toISOString(),
            ),
          },
        }))
        .filter((group) => Number.isFinite(group.id) && group.id > 0),
    [inboxThreads],
  );
  const groupedInboxSections = useMemo(
    () => ({
      coachGroups: groups
        .filter((group) => resolveGroupCategory(group) !== "announcement")
        .filter((group) => resolveGroupCategory(group) === "coach_group")
        .sort(
          (a, b) =>
            new Date(getGroupActivityTimestamp(b) ?? 0).getTime() -
            new Date(getGroupActivityTimestamp(a) ?? 0).getTime(),
        ),
      teamInbox: groups
        .filter((group) => resolveGroupCategory(group) !== "announcement")
        .filter((group) => resolveGroupCategory(group) === "team")
        .sort(
          (a, b) =>
            new Date(getGroupActivityTimestamp(b) ?? 0).getTime() -
            new Date(getGroupActivityTimestamp(a) ?? 0).getTime(),
        ),
    }),
    [groups],
  );
  const teams = useMemo<AdminTeamItem[]>(
    () => adminTeamsData?.teams ?? [],
    [adminTeamsData],
  );
  const teamInboxGroups = useMemo(
    () =>
      groups.filter(
        (group) => resolveGroupCategory(group) === "team",
      ),
    [groups],
  );
  const teamInboxByKey = useMemo(() => {
    const map = new Map<string, ChatGroupItem>();
    teamInboxGroups.forEach((group) => {
      const keys = [
        normalizeTeamKey(group.name),
        canonicalTeamMatchKey(group.name),
      ].filter(Boolean);
      keys.forEach((key) => {
        if (!map.has(key)) {
          map.set(key, group);
        }
      });
    });
    return map;
  }, [teamInboxGroups]);
  const teamMemberIdsByKey = useMemo(() => {
    const map = new Map<string, number[]>();
    chatEligibleUsers.forEach((user) => {
      const teamName = normalizeTeamKey(
        (
          user as MessagingUser & {
            athleteTeam?: string | null;
            team?: string | null;
          }
        ).athleteTeam ??
          (
            user as MessagingUser & {
              athleteTeam?: string | null;
              team?: string | null;
            }
          ).team,
      );
      if (!teamName) return;
      const list = map.get(teamName) ?? [];
      if (!list.includes(user.id)) list.push(user.id);
      map.set(teamName, list);
    });
    return map;
  }, [chatEligibleUsers]);
  const resolveTeamInboxGroup = (teamName: string) => {
    const teamKey = normalizeTeamKey(teamName);
    const teamCanonicalKey = canonicalTeamMatchKey(teamName);
    return (
      teamInboxByKey.get(teamKey) ??
      teamInboxByKey.get(teamCanonicalKey) ??
      teamInboxGroups.find((candidate) => {
        const candidateKey = canonicalTeamMatchKey(candidate.name);
        return (
          candidateKey.includes(teamCanonicalKey) ||
          teamCanonicalKey.includes(candidateKey)
        );
      }) ??
      null
    );
  };
  const announcements = useMemo<AnnouncementItem[]>(
    () => (announcementsData?.items as AnnouncementItem[] | undefined) ?? [],
    [announcementsData],
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["announcement", "inbox", "teams", "stats"].includes(tabParam)
    ) {
      setTab(tabParam);
    }

    const userIdParam = Number(searchParams.get("userId"));
    if (Number.isFinite(userIdParam) && userIdParam > 0) {
      const exists = threads.some((thread) => thread.userId === userIdParam);
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
  }, [searchParams, groups, threads]);

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
    const base =
      (directMessagesData?.messages as ChatMessage[] | undefined) ?? [];
    return base.map((message) => {
      const id = Number(message.id);
      if (!Number.isFinite(id)) return message;
      const reactions = directReactionOverrides[id];
      return reactions ? { ...message, reactions } : message;
    });
  }, [directMessagesData, directReactionOverrides]);

  const groupMessages = useMemo<ChatMessage[]>(() => {
    const base =
      (groupMessagesData?.messages as ChatMessage[] | undefined) ?? [];
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
      | { user?: { id?: number | string } }
      | undefined;
    const idValue = profilePayload?.user?.id;
    const normalized = Number(idValue ?? NaN);
    return Number.isFinite(normalized) ? normalized : null;
  }, [adminProfileData]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

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
      (
        (
          groupMembersData as
            | { members?: Array<{ userId?: number | string }> }
            | undefined
        )?.members ?? []
      )
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
    const parsedAudienceGroupId = Number(announcementAudienceGroupId);
    if (
      announcementAudienceType === "team" &&
      !announcementAudienceTeam.trim()
    ) {
      toast.error(
        "Missing team",
        "Choose a team for this announcement audience.",
      );
      return;
    }
    if (
      announcementAudienceType === "group" &&
      !Number.isFinite(parsedAudienceGroupId)
    ) {
      toast.error(
        "Missing group",
        "Choose a group for this announcement audience.",
      );
      return;
    }
    if (announcementAudienceType === "tier" && !announcementAudienceTier) {
      toast.error(
        "Missing tier",
        "Choose a tier for this announcement audience.",
      );
      return;
    }
    if (announcementTimingType === "scheduled") {
      if (
        !isValidDateTimeValue(announcementStartsAt) ||
        !isValidDateTimeValue(announcementEndsAt)
      ) {
        toast.error("Missing schedule", "Choose both a start and end time.");
        return;
      }
      const start = new Date(announcementStartsAt);
      const end = new Date(announcementEndsAt);
      if (end.getTime() <= start.getTime()) {
        toast.error(
          "Invalid schedule",
          "End time must be after the start time.",
        );
        return;
      }
    }

    const apiAudienceType =
      announcementAudienceType === "youth" ||
      announcementAudienceType === "adult"
        ? "athlete_type"
        : announcementAudienceType;
    const apiAthleteType =
      announcementAudienceType === "youth" ||
      announcementAudienceType === "adult"
        ? announcementAudienceType
        : undefined;

    try {
      const startsAt =
        announcementTimingType === "scheduled" &&
        isValidDateTimeValue(announcementStartsAt)
          ? new Date(announcementStartsAt).toISOString()
          : undefined;
      const endsAt =
        announcementTimingType === "scheduled" &&
        isValidDateTimeValue(announcementEndsAt)
          ? new Date(announcementEndsAt).toISOString()
          : undefined;
      await createAnnouncement({
        title: announcementTitle.trim(),
        content: announcementTitle.trim(),
        body: announcementBody.trim(),
        type: "article",
        surface: "announcements",
        announcementAudienceType: apiAudienceType,
        announcementAudienceAthleteType: apiAthleteType,
        announcementAudienceTier:
          announcementAudienceType === "tier"
            ? announcementAudienceTier
            : undefined,
        announcementAudienceTeam:
          announcementAudienceType === "team"
            ? announcementAudienceTeam.trim()
            : undefined,
        announcementAudienceGroupId:
          announcementAudienceType === "group"
            ? parsedAudienceGroupId
            : undefined,
        announcementStartsAt: startsAt,
        announcementEndsAt: endsAt,
      }).unwrap();
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementAudienceType("all");
      setAnnouncementAudienceTeam("");
      setAnnouncementAudienceGroupId("");
      setAnnouncementAudienceTier("");
      setAnnouncementTimingType("permanent");
      setAnnouncementStartsAt("");
      setAnnouncementEndsAt("");
      refetchAnnouncements();
      toast.success(
        "Announcement sent",
        "Your announcement is now visible to users.",
      );
    } catch {
      toast.error("Failed", "Could not publish announcement.");
    }
  };

  const startEditAnnouncement = (item: AnnouncementItem) => {
    const id = Number(item.id);
    if (!Number.isFinite(id)) return;
    setEditingAnnouncementId(id);
    setEditAnnouncementTitle(String(item.title ?? "").trim());
    setEditAnnouncementBody(String(item.body ?? "").trim());
    setEditAnnouncementIsActive(item.isActive ?? true);
    if (item.startsAt && item.endsAt) {
      setEditAnnouncementTimingType("scheduled");
      setEditAnnouncementStartsAt(toLocalInputValue(item.startsAt));
      setEditAnnouncementEndsAt(toLocalInputValue(item.endsAt));
    } else {
      setEditAnnouncementTimingType("permanent");
      setEditAnnouncementStartsAt("");
      setEditAnnouncementEndsAt("");
    }
  };

  const cancelEditAnnouncement = () => {
    setEditingAnnouncementId(null);
    setEditAnnouncementTitle("");
    setEditAnnouncementBody("");
    setEditAnnouncementTimingType("permanent");
    setEditAnnouncementStartsAt("");
    setEditAnnouncementEndsAt("");
    setEditAnnouncementIsActive(true);
  };

  const handleDeleteAnnouncement = (item: AnnouncementItem) => {
    const id = Number(item.id);
    if (!Number.isFinite(id)) {
      toast.error("Failed", "Invalid announcement id.");
      return;
    }
    setDeleteAnnouncementTarget(item);
  };

  const confirmDeleteAnnouncement = async () => {
    if (!deleteAnnouncementTarget) return;
    const id = Number(deleteAnnouncementTarget.id);
    if (!Number.isFinite(id)) {
      toast.error("Failed", "Invalid announcement id.");
      return;
    }
    try {
      setDeletingAnnouncementId(id);
      if (editingAnnouncementId === id) {
        cancelEditAnnouncement();
      }
      await deleteAnnouncement({ id }).unwrap();
      toast.success("Deleted", "Announcement removed.");
      setDeleteAnnouncementTarget(null);
      refetchAnnouncements();
    } catch {
      toast.error("Failed", "Could not delete announcement.");
    } finally {
      setDeletingAnnouncementId((current) => (current === id ? null : current));
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (editingAnnouncementId == null) return;
    if (!editAnnouncementTitle.trim() || !editAnnouncementBody.trim()) {
      toast.error("Missing fields", "Title and message are required.");
      return;
    }
    if (editAnnouncementTimingType === "scheduled") {
      if (
        !isValidDateTimeValue(editAnnouncementStartsAt) ||
        !isValidDateTimeValue(editAnnouncementEndsAt)
      ) {
        toast.error("Missing schedule", "Choose both a start and end time.");
        return;
      }
      const start = new Date(editAnnouncementStartsAt);
      const end = new Date(editAnnouncementEndsAt);
      if (end.getTime() <= start.getTime()) {
        toast.error(
          "Invalid schedule",
          "End time must be after the start time.",
        );
        return;
      }
    }
    try {
      const startsAt =
        editAnnouncementTimingType === "scheduled" &&
        isValidDateTimeValue(editAnnouncementStartsAt)
          ? new Date(editAnnouncementStartsAt).toISOString()
          : null;
      const endsAt =
        editAnnouncementTimingType === "scheduled" &&
        isValidDateTimeValue(editAnnouncementEndsAt)
          ? new Date(editAnnouncementEndsAt).toISOString()
          : null;
      await updateAnnouncement({
        id: editingAnnouncementId,
        data: {
          title: editAnnouncementTitle.trim(),
          content: editAnnouncementTitle.trim(),
          body: editAnnouncementBody.trim(),
          type: "article",
          announcementStartsAt: startsAt,
          announcementEndsAt: endsAt,
          announcementIsActive: editAnnouncementIsActive,
        },
      }).unwrap();
      cancelEditAnnouncement();
      refetchAnnouncements();
      toast.success("Updated", "Announcement updated.");
    } catch {
      toast.error("Failed", "Could not update announcement.");
    }
  };

  const openDirectThread = async (userId: number) => {
    setThreadUserId(userId);
    setDirectReactionOverrides({});
    setDirectReplyTo(null);
    try {
      await markThreadRead({ userId }).unwrap();
      refetchInbox();
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
      refetchInbox();
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
      refetchInbox();
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
	        client: "web",
	      }).unwrap();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed."));
        };
        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.open("PUT", presign.uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
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
        refetchInbox();
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
        refetchInbox();
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
      const response = await fetch(
        `/api/giphy/search?q=${encodeURIComponent(cleanQuery)}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as GifApiResponse | null;
      if (!response.ok) {
        setGifResults([]);
        toast.error(
          "GIF search unavailable",
          payload?.error ?? "Could not load GIFs right now.",
        );
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
        refetchInbox();
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
        refetchInbox();
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
      console.error("[Messaging][DirectReaction] error", {
        messageId,
        emoji,
        error,
      });
      toast.error("Failed", "Could not update reaction.");
    }
  };

  const handleGroupReaction = async (messageId: number, emoji: string) => {
    if (!groupId) return;
    try {
      console.log("[Messaging][GroupReaction] request", {
        groupId,
        messageId,
        emoji,
      });
      const result = await toggleGroupReaction({
        groupId,
        messageId,
        emoji,
      }).unwrap();
      console.log("[Messaging][GroupReaction] response", result);
      if (Array.isArray(result?.reactions)) {
        setGroupReactionOverrides((current) => ({
          ...current,
          [messageId]: result.reactions as ChatReaction[],
        }));
      }
      refetchGroupMessages();
    } catch (error) {
      console.error("[Messaging][GroupReaction] error", {
        groupId,
        messageId,
        emoji,
        error,
      });
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
      refetchInbox();
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

  const openTeamInbox = async (team: AdminTeamItem) => {
    const teamKey = normalizeTeamKey(team.team);
    setHighlightedTeamName(teamKey);
    setThreadUserId(null);
    setDirectReplyTo(null);
    const existingGroup = resolveTeamInboxGroup(team.team);
    if (existingGroup?.id) {
      setHighlightedInboxGroupId(existingGroup.id);
      setGroupId(existingGroup.id);
      return;
    }

    const memberIds = teamMemberIdsByKey.get(teamKey) ?? [];
    if (!memberIds.length) {
      toast.error(
        "No team inbox yet",
        "This team has no chat-eligible members to start an inbox.",
      );
      return;
    }

    try {
      const response = await createGroup({
        name: team.team.trim(),
        category: "team",
        memberIds,
      }).unwrap();
      await refetchInbox();
      const createdGroupId = Number(response?.group?.id ?? NaN);
      if (Number.isFinite(createdGroupId) && createdGroupId > 0) {
        setHighlightedInboxGroupId(createdGroupId);
        setGroupId(createdGroupId);
      }
      toast.success("Team inbox ready", `Opened ${team.team} inbox.`);
    } catch {
      toast.error("Failed", "Could not open or create this team inbox.");
    }
  };

  const handleAddMembersToGroup = async () => {
    if (!manageGroupId || !manageSelectedMemberIds.length) return;
    try {
      await addChatGroupMembers({
        groupId: manageGroupId,
        memberIds: [...new Set(manageSelectedMemberIds)],
      }).unwrap();
      toast.success(
        "Members added",
        "Selected members were added to the group.",
      );
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
      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "")}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="announcement" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Announcement</span>
              <span className="sm:hidden">Announce</span>
            </TabsTrigger>
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users2 className="h-4 w-4 shrink-0" /> Teams
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 shrink-0" /> Stats
            </TabsTrigger>
          </TabsList>
        </div>

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
                    <p className="text-xs text-muted-foreground">
                      Audience type
                    </p>
                    {(() => {
                      const audienceTypeItems = [
                        { label: "All users", value: "all" },
                        { label: "Youth athletes", value: "youth" },
                        { label: "Adult athletes", value: "adult" },
                        { label: "Specific team", value: "team" },
                        { label: "Specific group", value: "group" },
                        { label: "Program tier", value: "tier" },
                      ];
                      return (
                        <Select
                          items={audienceTypeItems}
                          value={announcementAudienceType}
                          onValueChange={(v) =>
                            setAnnouncementAudienceType(
                              v as "all" | "youth" | "adult" | "team" | "group" | "tier",
                            )
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectPopup>
                            {audienceTypeItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      );
                    })()}
                  </div>
                  {announcementAudienceType === "team" ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Team</p>
                      {(() => {
                        const teamItems = [
                          { label: "Choose a team", value: "" },
                          ...teams.map((team) => ({ label: team.team, value: team.team })),
                        ];
                        return (
                          <Select
                            items={teamItems}
                            value={announcementAudienceTeam}
                            onValueChange={(v) => setAnnouncementAudienceTeam(v ?? "")}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectPopup>
                              {teamItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                              ))}
                            </SelectPopup>
                          </Select>
                        );
                      })()}
                    </div>
                  ) : null}
                  {announcementAudienceType === "group" ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Group</p>
                      {(() => {
                        const groupItems = [
                          { label: "Choose a group", value: "" },
                          ...groups.map((group) => ({
                            label: group.name ?? `Group ${group.id}`,
                            value: String(group.id),
                          })),
                        ];
                        return (
                          <Select
                            items={groupItems}
                            value={announcementAudienceGroupId}
                            onValueChange={(v) => setAnnouncementAudienceGroupId(v ?? "")}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectPopup>
                              {groupItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                              ))}
                            </SelectPopup>
                          </Select>
                        );
                      })()}
                    </div>
                  ) : null}
                  {announcementAudienceType === "tier" ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Tier</p>
                      {(() => {
                        const tierItems = [
                          { label: "Choose a tier", value: "" },
                          { label: "PHP", value: "PHP" },
                          { label: "PHP Premium", value: "PHP_Premium" },
                          { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
                          { label: "PHP Pro", value: "PHP_Pro" },
                        ];
                        return (
                          <Select
                            items={tierItems}
                            value={announcementAudienceTier}
                            onValueChange={(v) => setAnnouncementAudienceTier(v ?? "")}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectPopup>
                              {tierItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                              ))}
                            </SelectPopup>
                          </Select>
                        );
                      })()}
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Timing</p>
                    {(() => {
                      const timingItems = [
                        { label: "Permanent", value: "permanent" },
                        { label: "Scheduled", value: "scheduled" },
                      ];
                      return (
                        <Select
                          items={timingItems}
                          value={announcementTimingType}
                          onValueChange={(v) =>
                            setAnnouncementTimingType(v as "permanent" | "scheduled")
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectPopup>
                            {timingItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      );
                    })()}
                  </div>
                </div>
                {announcementTimingType === "scheduled" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Starts</p>
                      <Input
                        type="datetime-local"
                        value={announcementStartsAt}
                        onChange={(event) =>
                          setAnnouncementStartsAt(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Ends</p>
                      <Input
                        type="datetime-local"
                        value={announcementEndsAt}
                        onChange={(event) =>
                          setAnnouncementEndsAt(event.target.value)
                        }
                      />
                    </div>
                  </div>
                ) : null}
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
                    (announcementAudienceType === "team" &&
                      !announcementAudienceTeam) ||
                    (announcementAudienceType === "group" &&
                      !announcementAudienceGroupId) ||
                    (announcementAudienceType === "tier" &&
                      !announcementAudienceTier) ||
                    (announcementTimingType === "scheduled" &&
                      (!isValidDateTimeValue(announcementStartsAt) ||
                        !isValidDateTimeValue(announcementEndsAt) ||
                        new Date(announcementEndsAt).getTime() <=
                          new Date(announcementStartsAt).getTime()))
                  }
                >
                  {isCreatingAnnouncement ? "Sending..." : "Send announcement"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Recent announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[430px] pr-3">
                  <div className="space-y-3">
                    {announcements.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.createdBy
                                ? `By ${resolveUserName(Number(item.createdBy))}`
                                : "By Coach"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Status: {item.isActive === false ? "Off" : "On"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatSchedule(item.startsAt, item.endsAt)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(item.createdAt)}
                          </span>
                        </div>
                        {editingAnnouncementId === Number(item.id) ? (
                          <div className="mt-3 space-y-2">
                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Status
                                </p>
                                {(() => {
                                  const activeItems = [
                                    { label: "On", value: "on" },
                                    { label: "Off", value: "off" },
                                  ];
                                  return (
                                    <Select
                                      items={activeItems}
                                      value={editAnnouncementIsActive ? "on" : "off"}
                                      onValueChange={(v) =>
                                        setEditAnnouncementIsActive(v === "on")
                                      }
                                    >
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectPopup>
                                        {activeItems.map((item) => (
                                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                      </SelectPopup>
                                    </Select>
                                  );
                                })()}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Timing
                                </p>
                                {(() => {
                                  const editTimingItems = [
                                    { label: "Permanent", value: "permanent" },
                                    { label: "Scheduled", value: "scheduled" },
                                  ];
                                  return (
                                    <Select
                                      items={editTimingItems}
                                      value={editAnnouncementTimingType}
                                      onValueChange={(v) =>
                                        setEditAnnouncementTimingType(v as "permanent" | "scheduled")
                                      }
                                    >
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectPopup>
                                        {editTimingItems.map((item) => (
                                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                      </SelectPopup>
                                    </Select>
                                  );
                                })()}
                              </div>
                            </div>
                            {editAnnouncementTimingType === "scheduled" ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                <Input
                                  type="datetime-local"
                                  value={editAnnouncementStartsAt}
                                  onChange={(event) =>
                                    setEditAnnouncementStartsAt(
                                      event.target.value,
                                    )
                                  }
                                />
                                <Input
                                  type="datetime-local"
                                  value={editAnnouncementEndsAt}
                                  onChange={(event) =>
                                    setEditAnnouncementEndsAt(
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>
                            ) : null}
                            <Input
                              value={editAnnouncementTitle}
                              onChange={(event) =>
                                setEditAnnouncementTitle(event.target.value)
                              }
                            />
                            <Textarea
                              value={editAnnouncementBody}
                              onChange={(event) =>
                                setEditAnnouncementBody(event.target.value)
                              }
                              className="min-h-28"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => void handleUpdateAnnouncement()}
                                disabled={isUpdatingAnnouncement}
                              >
                                {isUpdatingAnnouncement ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={cancelEditAnnouncement}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                              {item.body}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => startEditAnnouncement(item)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                disabled={
                                  deletingAnnouncementId === Number(item.id)
                                }
                                onClick={() =>
                                  void handleDeleteAnnouncement(item)
                                }
                              >
                                {deletingAnnouncementId === Number(item.id)
                                  ? "Deleting..."
                                  : "Delete"}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {!announcements.length ? (
                      <p className="text-sm text-muted-foreground">
                        No announcements yet.
                      </p>
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
                  description="Organized as coach groups and team inbox."
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      key: "coach-groups",
                      title: "Coach groups",
                      items: groupedInboxSections.coachGroups,
                      tone: "bg-sky-500/10 text-sky-200 border-sky-500/30",
                    },
                    {
                      key: "team-inbox",
                      title: "Team inbox",
                      items: groupedInboxSections.teamInbox,
                      tone: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
                    },
                  ].map((section) => (
                    <div key={section.key} className="space-y-2">
                      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-background/95 py-1 backdrop-blur">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {section.title}
                        </p>
                        <Badge variant="outline">{section.items.length}</Badge>
                      </div>
                      {section.items.map((group) => {
                        const lastSender = getGroupLastSender(group);
                        return (
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
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {group.name}
                                </p>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] ${section.tone}`}
                                >
                                  {categoryLabel(resolveGroupCategory(group))}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {formatGroupLastMessagePreview(group)}
                              </p>
                              {lastSender ? (
                                <p className="mt-1 truncate text-[11px] text-muted-foreground/80">
                                  Sender: {lastSender} · Group:{" "}
                                  {String(group.name ?? "Group")}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(getGroupActivityTimestamp(group))}
                              </span>
                              {Number(group.unreadCount ?? 0) > 0 ? (
                                <Badge className="h-5 rounded-full px-2 text-[10px]">
                                  {formatUnreadCount(
                                    Number(group.unreadCount),
                                  ) ?? ""}
                                </Badge>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
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
                description="Open team inbox chats from roster teams. Missing inboxes are created automatically from team members."
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teams.map((team) => (
                  (() => {
                    const resolvedTeamInboxGroup = resolveTeamInboxGroup(
                      team.team,
                    );
                    return (
                  <button
                    key={team.team}
                    type="button"
                    onClick={() => void openTeamInbox(team)}
                    className={`rounded-xl border bg-background p-4 ${
                      highlightedTeamName &&
                      team.team.toLowerCase() === highlightedTeamName
                        ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {team.team}
                          </p>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                            Team inbox
                          </span>
                          {(() => {
                            const unread = Number(
                              resolvedTeamInboxGroup?.unreadCount ?? 0,
                            );
                            if (!Number.isFinite(unread) || unread <= 0)
                              return null;
                            return (
                              <Badge className="h-5 rounded-full px-2 text-[10px]">
                                {formatUnreadCount(unread)}
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {team.youthCount} youth · {team.adultCount} adult ·{" "}
                          {teamMemberIdsByKey.get(normalizeTeamKey(team.team))
                            ?.length ?? 0}{" "}
                          chat members
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground/90">
                          {formatGroupLastMessagePreview(
                            resolvedTeamInboxGroup ?? {
                              id: 0,
                              name: team.team,
                              category: "team",
                              createdAt: team.createdAt,
                              unreadCount: 0,
                            },
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Updated {formatTime(team.updatedAt)}</p>
                        <p>Created {formatTime(team.createdAt)}</p>
                        <p className="mt-1 text-[11px] text-primary/90">
                          Open chat
                        </p>
                      </div>
                    </div>
                  </button>
                    );
                  })()
                ))}
                {!teams.length ? (
                  <p className="text-sm text-muted-foreground">
                    No teams found.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {stats.totalAnnouncements}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inbox threads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {stats.totalThreads}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unread messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {stats.unreadThreads}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {stats.totalTeams}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inbox groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">
                  {stats.totalGroups}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={threadUserId != null}
        onOpenChange={(open) => (open ? null : setThreadUserId(null))}
      >
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
              replyingTo={
                directReplyTo ? { preview: directReplyTo.preview } : null
              }
              onCancelReply={() => setDirectReplyTo(null)}
              onPickPhoto={() => openFilePicker("direct", "image/*")}
              onPickVideo={() => openFilePicker("direct", "video/*")}
              onPickGif={() => openGifPicker("direct")}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={groupId != null}
        onOpenChange={(open) => (open ? null : setGroupId(null))}
      >
        <DialogContent className="max-h-[92vh] w-[96vw] sm:max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>
                {groups.find((group) => group.id === groupId)?.name ??
                  "Group chat"}
              </DialogTitle>
              {groupId ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openManageGroupMembers(groupId)}
                >
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
              replyingTo={
                groupReplyTo ? { preview: groupReplyTo.preview } : null
              }
              onCancelReply={() => setGroupReplyTo(null)}
              onPickPhoto={() => openFilePicker("group", "image/*")}
              onPickVideo={() => openFilePicker("group", "video/*")}
              onPickGif={() => openGifPicker("group")}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteAnnouncementTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteAnnouncementTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete announcement?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteAnnouncementTarget?.title || "this announcement"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteAnnouncementTarget(null)}
              disabled={
                deletingAnnouncementId ===
                Number(deleteAnnouncementTarget?.id ?? NaN)
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteAnnouncement()}
              disabled={
                deletingAnnouncementId ===
                Number(deleteAnnouncementTarget?.id ?? NaN)
              }
            >
              {deletingAnnouncementId ===
              Number(deleteAnnouncementTarget?.id ?? NaN)
                ? "Deleting..."
                : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
            <DialogDescription>
              Set a group name and choose members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Group type</p>
              {(() => {
                const groupCategoryItems = [
                  { label: "Coach group", value: "coach_group" },
                  { label: "Team inbox", value: "team" },
                ];
                return (
                  <Select
                    items={groupCategoryItems}
                    value={newGroupCategory}
                    onValueChange={(v) =>
                      setNewGroupCategory(v as "coach_group" | "team")
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {groupCategoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                );
              })()}
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
                            selected
                              ? current.filter((id) => id !== user.id)
                              : [...current, user.id],
                          )
                        }
                      />
                    </label>
                  );
                })}
                {!filteredGroupMembers.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No members found.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedMemberIds.length} members selected
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setGroupModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreateGroup()}
                disabled={
                  isCreatingGroup ||
                  !newGroupName.trim() ||
                  !selectedMemberIds.length
                }
              >
                {isCreatingGroup ? "Creating..." : "Create group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manageGroupMembersOpen}
        onOpenChange={setManageGroupMembersOpen}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>
              {groups.find((group) => group.id === manageGroupId)?.name ??
                "Group"}
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
                            selected
                              ? current.filter((id) => id !== user.id)
                              : [...current, user.id],
                          )
                        }
                      />
                    </label>
                  );
                })}
                {!filteredManageMembers.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No members available.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {manageSelectedMemberIds.length} members selected
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setManageGroupMembersOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleAddMembersToGroup()}
                disabled={
                  isAddingGroupMembers ||
                  !manageSelectedMemberIds.length ||
                  !manageGroupId
                }
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

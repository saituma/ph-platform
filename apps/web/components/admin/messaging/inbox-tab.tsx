"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAddChatGroupMembersMutation,
  useCreateChatGroupMutation,
  useCreateMediaUploadUrlMutation,
  useDeleteGroupMessageMutation,
  useDeleteMessageMutation,
  useEditGroupMessageMutation,
  useEditMessageMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useGetMessagesQuery,
  useMarkChatGroupReadMutation,
  useMarkThreadReadMutation,
  useSendChatGroupMessageMutation,
  useSendMessageMutation,
  useToggleChatGroupMessageReactionMutation,
  useToggleMessageReactionMutation,
} from "@/lib/apiSlice";
import { getOrCreateAdminSocket } from "@/lib/admin-socket";
import { toast } from "../../../lib/toast";
import { ChatComposer } from "./chat-composer";
import { TenorPickerDialog } from "./tenor-picker-dialog";
import { ThreadMessageList } from "./thread-message-list";
import type { ChatGroupItem, ChatMessage, ChatReaction, MessagingUser } from "./types";
import type { GifResult, LiveHandlers, ThreadListItem } from "./messaging-utils";
import {
  getGroupActivityTimestamp,
  formatGroupLastMessagePreview,
  resolveGroupCategory,
} from "./messaging-utils";
import { ChevronLeft, Edit2, MessageCircle, Search, UsersRound } from "lucide-react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";
import { cleanPreview, initials } from "./inbox-thread-panel";

type GifApiResponse = {
  error?: string;
  results?: GifResult[];
};

type InboxTabProps = {
  threads: ThreadListItem[];
  groups: ChatGroupItem[];
  users: MessagingUser[];
  currentUserId: number | null;
  resolveUserName: (userId: number) => string;
  formatTime: (value?: string | null) => string;
  scheduleInboxRefetch: (delayMs?: number) => void;
  refetchInbox: () => void;
  highlightedInboxThreadUserId: number | null;
  highlightedInboxGroupId: number | null;
  setHighlightedInboxGroupId: (id: number | null) => void;
  requestedGroupId: number | null;
  onRequestedGroupHandled: () => void;
  registerLiveHandlers: (handlers: LiveHandlers | null) => void;
};

export function InboxTab({
  threads,
  groups,
  users,
  currentUserId,
  resolveUserName,
  formatTime,
  scheduleInboxRefetch,
  refetchInbox,
  highlightedInboxThreadUserId,
  highlightedInboxGroupId,
  setHighlightedInboxGroupId,
  requestedGroupId,
  onRequestedGroupHandled,
  registerLiveHandlers,
}: InboxTabProps) {
  const [threadUserId, setThreadUserId] = useState<number | null>(null);
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
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [directReactionOverrides, setDirectReactionOverrides] = useState<
    Record<number, ChatReaction[]>
  >({});
  const [groupReactionOverrides, setGroupReactionOverrides] = useState<
    Record<number, ChatReaction[]>
  >({});
  const [pendingDirectMessages, setPendingDirectMessages] = useState<
    ChatMessage[]
  >([]);
  const [pendingGroupMessages, setPendingGroupMessages] = useState<
    ChatMessage[]
  >([]);
  const [liveDirectMessages, setLiveDirectMessages] = useState<ChatMessage[]>([]);
  const [liveGroupMessages, setLiveGroupMessages] = useState<ChatMessage[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState<
    "announcement" | "coach_group" | "team"
  >("coach_group");
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsgQuery, setNewMsgQuery] = useState("");
  const [manageGroupMembersOpen, setManageGroupMembersOpen] = useState(false);
  const [manageGroupId, setManageGroupId] = useState<number | null>(null);
  const [manageMemberQuery, setManageMemberQuery] = useState("");
  const [manageSelectedMemberIds, setManageSelectedMemberIds] = useState<
    number[]
  >([]);
  const [listQuery, setListQuery] = useState("");

  const threadRowRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const groupRowRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const activeThreadUserIdRef = useRef<number | null>(null);
  const activeGroupIdRef = useRef<number | null>(null);
  const directRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sendDirect, { isLoading: isSendingDirect }] = useSendMessageMutation();
  const [sendGroup, { isLoading: isSendingGroup }] = useSendChatGroupMessageMutation();
  const [markThreadRead] = useMarkThreadReadMutation();
  const [markChatGroupRead] = useMarkChatGroupReadMutation();
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateChatGroupMutation();
  const [addChatGroupMembers, { isLoading: isAddingGroupMembers }] = useAddChatGroupMembersMutation();
  const [toggleDirectReaction] = useToggleMessageReactionMutation();
  const [toggleGroupReaction] = useToggleChatGroupMessageReactionMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [deleteGroupMessage] = useDeleteGroupMessageMutation();
  const [editMessage] = useEditMessageMutation();
  const [editGroupMessage] = useEditGroupMessageMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();

  const { data: directMessagesData, refetch: refetchDirectMessages } =
    useGetMessagesQuery(threadUserId ?? skipToken);
  const { data: groupMessagesData, refetch: refetchGroupMessages } =
    useGetChatGroupMessagesQuery(groupId ?? skipToken);
  const { data: groupMembersData } = useGetChatGroupMembersQuery(
    manageGroupId ?? skipToken,
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

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    chatEligibleUsers.forEach((user) => {
      map.set(user.id, user.name ?? user.email ?? `User ${user.id}`);
    });
    return map;
  }, [chatEligibleUsers]);

  const directThreadName = useMemo(() => {
    if (!threadUserId) return "";
    return userNameById.get(threadUserId) ?? `User ${threadUserId}`;
  }, [threadUserId, userNameById]);

  const scheduleDirectRefetch = useMemo(
    () => (delayMs = 120) => {
      if (directRefetchTimerRef.current) return;
      directRefetchTimerRef.current = setTimeout(() => {
        directRefetchTimerRef.current = null;
        refetchDirectMessages();
      }, delayMs);
    },
    [refetchDirectMessages],
  );

  const scheduleGroupRefetch = useMemo(
    () => (delayMs = 120) => {
      if (groupRefetchTimerRef.current) return;
      groupRefetchTimerRef.current = setTimeout(() => {
        groupRefetchTimerRef.current = null;
        refetchGroupMessages();
      }, delayMs);
    },
    [refetchGroupMessages],
  );

  const directMessages = useMemo<ChatMessage[]>(() => {
    const base =
      (directMessagesData?.messages as ChatMessage[] | undefined) ?? [];
    const merged = [...base, ...liveDirectMessages, ...pendingDirectMessages];
    const uniqueById = new Map<number, ChatMessage>();
    for (const message of merged) {
      const id = Number(message.id);
      if (!Number.isFinite(id)) continue;
      uniqueById.set(id, message);
    }
    return [...uniqueById.values()]
      .sort(
        (a, b) =>
          new Date(String(a.createdAt ?? "")).getTime() -
          new Date(String(b.createdAt ?? "")).getTime(),
      )
      .map((message) => {
        const id = Number(message.id);
        if (!Number.isFinite(id)) return message;
        const reactions = directReactionOverrides[id];
        return reactions ? { ...message, reactions } : message;
      });
  }, [
    directMessagesData,
    directReactionOverrides,
    liveDirectMessages,
    pendingDirectMessages,
  ]);

  const groupMessages = useMemo<ChatMessage[]>(() => {
    const base =
      (groupMessagesData?.messages as ChatMessage[] | undefined) ?? [];
    const merged = [...base, ...liveGroupMessages, ...pendingGroupMessages];
    const uniqueById = new Map<number, ChatMessage>();
    for (const message of merged) {
      const id = Number(message.id);
      if (!Number.isFinite(id)) continue;
      uniqueById.set(id, message);
    }
    return [...uniqueById.values()]
      .sort(
        (a, b) =>
          new Date(String(a.createdAt ?? "")).getTime() -
          new Date(String(b.createdAt ?? "")).getTime(),
      )
      .map((message) => {
        const id = Number(message.id);
        if (!Number.isFinite(id)) return message;
        const reactions = groupReactionOverrides[id];
        return reactions ? { ...message, reactions } : message;
      });
  }, [
    groupMessagesData,
    groupReactionOverrides,
    liveGroupMessages,
    pendingGroupMessages,
  ]);

  const groupedInboxSections = useMemo(
    () => ({
      coachGroups: groups
        .filter((group) => resolveGroupCategory(group) === "coach_group")
        .sort(
          (a, b) =>
            new Date(getGroupActivityTimestamp(b) ?? 0).getTime() -
            new Date(getGroupActivityTimestamp(a) ?? 0).getTime(),
        ),
      teamInbox: groups
        .filter((group) => resolveGroupCategory(group) === "team")
        .sort(
          (a, b) =>
            new Date(getGroupActivityTimestamp(b) ?? 0).getTime() -
            new Date(getGroupActivityTimestamp(a) ?? 0).getTime(),
        ),
    }),
    [groups],
  );

  const allGroups = useMemo(
    () => [...groupedInboxSections.coachGroups, ...groupedInboxSections.teamInbox],
    [groupedInboxSections],
  );

  const filteredThreads = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        cleanPreview(t.preview).toLowerCase().includes(q)
      );
    });
  }, [threads, listQuery]);

  const filteredGroupList = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter((g) => String(g.name ?? "").toLowerCase().includes(q));
  }, [allGroups, listQuery]);

  const filteredGroupMembers = useMemo(() => {
    const query = groupMemberQuery.trim().toLowerCase();
    if (!query) return chatEligibleUsers;
    return chatEligibleUsers.filter((user) => {
      const name = String(user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [chatEligibleUsers, groupMemberQuery]);

  const newMessageRecipients = useMemo(() => {
    const query = newMsgQuery.trim().toLowerCase();
    const base = [...chatEligibleUsers].sort((a, b) =>
      String(a.name ?? a.email ?? "").localeCompare(String(b.name ?? b.email ?? "")),
    );
    if (!query) return base;
    return base.filter((user) => {
      const name = String(user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [chatEligibleUsers, newMsgQuery]);

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

  // Sync refs
  useEffect(() => {
    activeThreadUserIdRef.current = threadUserId;
  }, [threadUserId]);

  useEffect(() => {
    setLiveDirectMessages([]);
    setPendingDirectMessages([]);
  }, [threadUserId]);

  useEffect(() => {
    activeGroupIdRef.current = groupId;
  }, [groupId]);

  useEffect(() => {
    setLiveGroupMessages([]);
    setPendingGroupMessages([]);
  }, [groupId]);

  useEffect(() => {
    if (groupId == null) {
      setGroupReactionOverrides({});
    }
  }, [groupId]);

  // Timer cleanup
  useEffect(() => {
    return () => {
      if (directRefetchTimerRef.current) clearTimeout(directRefetchTimerRef.current);
      if (groupRefetchTimerRef.current) clearTimeout(groupRefetchTimerRef.current);
    };
  }, []);

  // Mark group read when opened
  useEffect(() => {
    if (groupId == null) return;
    let active = true;
    (async () => {
      try {
        await markChatGroupRead({ groupId }).unwrap();
        if (!active) return;
        scheduleInboxRefetch(60);
      } catch {
        // keep opening even if mark-read fails
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId, markChatGroupRead, scheduleInboxRefetch]);

  // Socket group join/leave
  useEffect(() => {
    const socket = getOrCreateAdminSocket();
    if (!socket?.connected) return;
    if (!groupId) return;
    socket.emit("group:join", { groupId });
    return () => {
      socket.emit("group:leave", { groupId });
    };
  }, [groupId]);

  // Scroll highlighted group into view
  useEffect(() => {
    if (!highlightedInboxGroupId) return;
    const target = groupRowRefs.current[highlightedInboxGroupId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedInboxGroupId]);

  // Open group when requested from orchestrator (e.g., team tab → switch to inbox)
  useEffect(() => {
    if (requestedGroupId == null) return;
    setGroupId(requestedGroupId);
    onRequestedGroupHandled();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedGroupId]);

  // Register live handlers on mount, unregister on unmount
  useEffect(() => {
    registerLiveHandlers({
      onDirectMessage: (message: ChatMessage) => {
        setLiveDirectMessages((current) =>
          current.some((msg) => Number(msg.id) === Number(message.id))
            ? current
            : [...current, message],
        );
      },
      onGroupMessage: (message: ChatMessage, incomingGroupId: number) => {
        if (
          activeGroupIdRef.current &&
          incomingGroupId === activeGroupIdRef.current &&
          Number.isFinite(Number(message.id))
        ) {
          setLiveGroupMessages((current) =>
            current.some((msg) => Number(msg.id) === Number(message.id))
              ? current
              : [...current, message],
          );
        }
      },
      onDirectReaction: (messageId: number, reactions: ChatReaction[]) => {
        setDirectReactionOverrides((current) => ({
          ...current,
          [messageId]: reactions,
        }));
      },
      onGroupReaction: (_incomingGroupId: number, messageId: number, reactions: ChatReaction[]) => {
        setGroupReactionOverrides((current) => ({
          ...current,
          [messageId]: reactions,
        }));
      },
      getActiveThreadUserId: () => activeThreadUserIdRef.current,
      getActiveGroupId: () => activeGroupIdRef.current,
      scheduleDirectRefetch,
      scheduleGroupRefetch,
    });
    return () => {
      registerLiveHandlers(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDirectThread = async (userId: number) => {
    setThreadUserId(userId);
    setDirectReactionOverrides({});
    setDirectReplyTo(null);
    try {
      await markThreadRead({ userId }).unwrap();
      scheduleInboxRefetch(60);
      scheduleDirectRefetch(60);
    } catch {
      // keep opening even if mark-read fails
    }
  };

  const handleSendDirect = async () => {
    if (!threadUserId || !directMessage.trim()) return;
    const pendingId = -Date.now();
    const pendingMsg: ChatMessage = {
      id: pendingId,
      senderId: currentUserId ?? 0,
      receiverId: threadUserId,
      content: directMessage.trim(),
      contentType: "text",
      createdAt: new Date().toISOString(),
      reactions: [],
      localStatus: "sending",
    };
    setPendingDirectMessages((current) => [...current, pendingMsg]);
    const draft = directMessage.trim();
    setDirectMessage("");
    try {
      const result = (await sendDirect({
        userId: threadUserId,
        content: draft,
        contentType: "text",
        replyToMessageId: directReplyTo?.messageId,
        replyPreview: directReplyTo?.preview,
      }).unwrap()) as any;
      setPendingDirectMessages((current) =>
        current.filter((message) => Number(message.id) !== pendingId),
      );
      if (result?.message?.id) {
        setLiveDirectMessages((current) =>
          current.some((m) => Number(m.id) === Number(result.message.id))
            ? current
            : [...current, { ...(result.message as ChatMessage), localStatus: null }],
        );
      }
      setDirectReplyTo(null);
      scheduleDirectRefetch(60);
      scheduleInboxRefetch(60);
    } catch {
      setPendingDirectMessages((current) =>
        current.filter((message) => Number(message.id) !== pendingId),
      );
      setDirectMessage(draft);
      toast.error("Failed", "Could not send message.");
    }
  };

  const handleSendGroup = async () => {
    if (!groupId || !groupMessage.trim()) return;
    const pendingId = -Date.now();
    const pendingMsg: ChatMessage = {
      id: pendingId,
      senderId: currentUserId ?? 0,
      receiverId: null,
      content: groupMessage.trim(),
      contentType: "text",
      createdAt: new Date().toISOString(),
      reactions: [],
      localStatus: "sending",
    };
    setPendingGroupMessages((current) => [...current, pendingMsg]);
    const draft = groupMessage.trim();
    setGroupMessage("");
    try {
      const result = (await sendGroup({
        groupId,
        content: draft,
        contentType: "text",
        replyToMessageId: groupReplyTo?.messageId,
        replyPreview: groupReplyTo?.preview,
      }).unwrap()) as any;
      setPendingGroupMessages((current) =>
        current.filter((message) => Number(message.id) !== pendingId),
      );
      if (result?.message?.id) {
        setLiveGroupMessages((current) =>
          current.some((m) => Number(m.id) === Number(result.message.id))
            ? current
            : [...current, { ...(result.message as ChatMessage), localStatus: null }],
        );
      }
      setGroupReplyTo(null);
      scheduleGroupRefetch(60);
      scheduleInboxRefetch(60);
    } catch {
      setPendingGroupMessages((current) =>
        current.filter((message) => Number(message.id) !== pendingId),
      );
      setGroupMessage(draft);
      toast.error("Failed", "Could not send group message.");
    }
  };

  const uploadAndSendMedia = async (file: File, target: "direct" | "group") => {
    if (target === "direct" && !threadUserId) return;
    if (target === "group" && !groupId) return;

    const resolvedType = file.type.startsWith("video/") ? "video" : "image";
    const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    try {
      setIsUploadingMedia(true);
      const presign = await createMediaUploadUrl({
        folder: "chat-media",
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
        scheduleDirectRefetch(60);
        scheduleInboxRefetch(60);
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
        scheduleGroupRefetch(60);
        scheduleInboxRefetch(60);
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
        { cache: "no-store" },
      );
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
    if (currentUserId != null) {
      const source =
        directReactionOverrides[messageId] ??
        directMessages.find((message) => Number(message.id) === messageId)
          ?.reactions ??
        [];
      const next = Array.isArray(source)
        ? source.map((reaction) => ({
            ...reaction,
            userIds: [...(reaction.userIds ?? [])],
          }))
        : [];
      const existingIdx = next.findIndex((reaction) =>
        Array.isArray(reaction.userIds)
          ? reaction.userIds.includes(currentUserId)
          : false,
      );
      if (existingIdx >= 0) {
        const existing = next[existingIdx];
        if (existing.emoji === emoji) {
          existing.userIds = existing.userIds!.filter((id) => id !== currentUserId);
          existing.count = existing.userIds.length;
        } else {
          existing.userIds = existing.userIds!.filter((id) => id !== currentUserId);
          existing.count = existing.userIds.length;
          const targetIdx = next.findIndex((reaction) => reaction.emoji === emoji);
          if (targetIdx >= 0) {
            const target = next[targetIdx];
            if (!target.userIds?.includes(currentUserId)) {
              target.userIds = [...(target.userIds ?? []), currentUserId];
            }
            target.count = target.userIds!.length;
          } else {
            next.push({ emoji, count: 1, userIds: [currentUserId] });
          }
        }
      } else {
        const targetIdx = next.findIndex((reaction) => reaction.emoji === emoji);
        if (targetIdx >= 0) {
          const target = next[targetIdx];
          target.userIds = [...(target.userIds ?? []), currentUserId];
          target.count = target.userIds.length;
        } else {
          next.push({ emoji, count: 1, userIds: [currentUserId] });
        }
      }
      setDirectReactionOverrides((current) => ({
        ...current,
        [messageId]: next.filter((reaction) => Number(reaction.count ?? 0) > 0),
      }));
    }
    try {
      const result = await toggleDirectReaction({ messageId, emoji }).unwrap();
      if (Array.isArray(result?.reactions)) {
        setDirectReactionOverrides((current) => ({
          ...current,
          [messageId]: result.reactions as ChatReaction[],
        }));
      }
    } catch {
      scheduleDirectRefetch(60);
      toast.error("Failed", "Could not update reaction.");
    }
  };

  const handleGroupReaction = async (messageId: number, emoji: string) => {
    if (!groupId) return;
    if (currentUserId != null) {
      const source =
        groupReactionOverrides[messageId] ??
        groupMessages.find((message) => Number(message.id) === messageId)
          ?.reactions ??
        [];
      const next = Array.isArray(source)
        ? source.map((reaction) => ({
            ...reaction,
            userIds: [...(reaction.userIds ?? [])],
          }))
        : [];
      const existingIdx = next.findIndex((reaction) =>
        Array.isArray(reaction.userIds)
          ? reaction.userIds.includes(currentUserId)
          : false,
      );
      if (existingIdx >= 0) {
        const existing = next[existingIdx];
        if (existing.emoji === emoji) {
          existing.userIds = existing.userIds!.filter((id) => id !== currentUserId);
          existing.count = existing.userIds.length;
        } else {
          existing.userIds = existing.userIds!.filter((id) => id !== currentUserId);
          existing.count = existing.userIds.length;
          const targetIdx = next.findIndex((reaction) => reaction.emoji === emoji);
          if (targetIdx >= 0) {
            const target = next[targetIdx];
            if (!target.userIds?.includes(currentUserId)) {
              target.userIds = [...(target.userIds ?? []), currentUserId];
            }
            target.count = target.userIds!.length;
          } else {
            next.push({ emoji, count: 1, userIds: [currentUserId] });
          }
        }
      } else {
        const targetIdx = next.findIndex((reaction) => reaction.emoji === emoji);
        if (targetIdx >= 0) {
          const target = next[targetIdx];
          target.userIds = [...(target.userIds ?? []), currentUserId];
          target.count = target.userIds.length;
        } else {
          next.push({ emoji, count: 1, userIds: [currentUserId] });
        }
      }
      setGroupReactionOverrides((current) => ({
        ...current,
        [messageId]: next.filter((reaction) => Number(reaction.count ?? 0) > 0),
      }));
    }
    try {
      const result = await toggleGroupReaction({ groupId, messageId, emoji }).unwrap();
      if (Array.isArray(result?.reactions)) {
        setGroupReactionOverrides((current) => ({
          ...current,
          [messageId]: result.reactions as ChatReaction[],
        }));
      }
    } catch {
      scheduleGroupRefetch(60);
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

  const activeGroupName = groups.find((g) => g.id === groupId)?.name ?? "Group chat";

  return (
    <>
      {/* Split-pane messaging layout */}
      <div className="flex h-[calc(100svh-10rem)] overflow-hidden rounded-xl border border-border bg-background">

        {/* LEFT: Conversation list */}
        <div className={`flex flex-col border-r border-border bg-background ${
          threadUserId != null || groupId != null
            ? "hidden lg:flex lg:w-[340px] xl:w-[380px]"
            : "flex w-full lg:w-[340px] xl:w-[380px]"
        }`}>
          {/* List header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Messages</h2>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => { setNewMsgQuery(""); setNewMsgOpen(true); }}
                title="New message"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setGroupModalOpen(true)}
                title="Create group"
              >
                <UsersRound className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-8 bg-muted/50 pl-8 text-sm border-transparent focus-visible:border-border focus-visible:bg-background focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Unified conversation list */}
          <ScrollArea className="flex-1">
            <div className="py-1">
              {filteredThreads.map((thread) => (
                <button
                  key={`dm-${thread.userId}`}
                  ref={(node) => { threadRowRefs.current[thread.userId] = node; }}
                  type="button"
                  onClick={() => {
                    setGroupId(null);
                    setHighlightedInboxGroupId(null);
                    void openDirectThread(thread.userId);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                    (threadUserId === thread.userId || highlightedInboxThreadUserId === thread.userId) && groupId == null
                      ? "bg-primary/10 hover:bg-primary/10"
                      : ""
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    thread.unread > 0
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {initials(thread.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className={`truncate text-sm ${thread.unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                        {thread.name}
                      </p>
                      <p className={`shrink-0 text-[11px] ${thread.unread > 0 ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                        {formatTime(thread.updatedAt)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <p className={`truncate text-xs ${thread.unread > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>
                        {cleanPreview(thread.preview)}
                      </p>
                      {thread.unread > 0 ? (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {thread.unread > 99 ? "99+" : thread.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}

              {filteredGroupList.length > 0 && filteredThreads.length > 0 && (
                <div className="mx-3 my-1 border-t border-border/40" />
              )}

              {filteredGroupList.map((group) => (
                <button
                  key={`group-${group.id}`}
                  ref={(node) => { groupRowRefs.current[group.id] = node; }}
                  type="button"
                  onClick={() => {
                    setThreadUserId(null);
                    setHighlightedInboxGroupId(group.id);
                    setGroupId(group.id);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                    groupId === group.id && threadUserId == null
                      ? "bg-primary/10 hover:bg-primary/10"
                      : ""
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {String(group.name ?? "G").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className={`truncate text-sm ${Number(group.unreadCount) > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                        {group.name}
                      </p>
                      <p className="shrink-0 text-[11px] text-muted-foreground">
                        {formatTime(getGroupActivityTimestamp(group))}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <p className="truncate text-xs text-muted-foreground">
                        {formatGroupLastMessagePreview(group)}
                      </p>
                      {Number(group.unreadCount ?? 0) > 0 ? (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {Number(group.unreadCount) > 99 ? "99+" : group.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}

              {!filteredThreads.length && !filteredGroupList.length ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {listQuery ? "No conversations match your search." : "No conversations yet."}
                  </p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: Thread view or empty state */}
        <div className={`flex flex-1 flex-col overflow-hidden ${
          threadUserId == null && groupId == null ? "hidden lg:flex" : "flex"
        }`}>
          {threadUserId != null ? (
            <>
              {/* Direct thread header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted lg:hidden"
                  onClick={() => setThreadUserId(null)}
                  aria-label="Back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {initials(directThreadName || "U")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{directThreadName || "Conversation"}</p>
                  <p className="text-xs text-muted-foreground">Direct message</p>
                </div>
              </div>
              {/* Messages */}
              <div className="min-h-0 flex-1">
                <ThreadMessageList
                  key={`direct-thread-${threadUserId}`}
                  openScrollKey={`direct-open-${threadUserId}`}
                  messages={directMessages}
                  onReact={handleDirectReaction}
                  onReply={(payload) => setDirectReplyTo(payload)}
                  onDelete={(messageId) =>
                    void deleteMessage({ messageId, userId: threadUserId }).catch(() => {})
                  }
                  onEdit={(messageId, content) =>
                    void editMessage({ messageId, content, userId: threadUserId }).catch(() => {})
                  }
                  formatTime={formatTime}
                  currentUserId={currentUserId}
                  resolveUserName={resolveUserName}
                  mode="direct"
                  directPeerUserId={threadUserId}
                  directPeerName={directThreadName}
                  emptyLabel="No messages yet."
                />
              </div>
              {/* Composer */}
              <ChatComposer
                value={directMessage}
                onChange={setDirectMessage}
                placeholder="Message"
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
            </>
          ) : groupId != null ? (
            <>
              {/* Group thread header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted lg:hidden"
                  onClick={() => setGroupId(null)}
                  aria-label="Back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {String(activeGroupName).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{activeGroupName}</p>
                  <p className="text-xs text-muted-foreground">Group thread</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-xs"
                  onClick={() => openManageGroupMembers(groupId)}
                >
                  Add member
                </Button>
              </div>
              {/* Messages */}
              <div className="min-h-0 flex-1">
                <ThreadMessageList
                  key={`group-thread-${groupId}`}
                  openScrollKey={`group-open-${groupId}`}
                  messages={groupMessages}
                  onReact={handleGroupReaction}
                  onReply={(payload) => setGroupReplyTo(payload)}
                  onDelete={(messageId) =>
                    void deleteGroupMessage({ groupId, messageId }).catch(() => {})
                  }
                  onEdit={(messageId, content) =>
                    void editGroupMessage({ groupId, messageId, content }).catch(() => {})
                  }
                  formatTime={formatTime}
                  currentUserId={currentUserId}
                  resolveUserName={resolveUserName}
                  mode="group"
                  showSenderName
                  emptyLabel="No group messages yet."
                />
              </div>
              {/* Composer */}
              <ChatComposer
                value={groupMessage}
                onChange={setGroupMessage}
                placeholder="Message"
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
            </>
          ) : (
            /* Empty state — no thread selected */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Your messages</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New message dialog */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>
              Start a direct conversation with any athlete (including youth) or parent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search by name or email..."
              value={newMsgQuery}
              onChange={(event) => setNewMsgQuery(event.target.value)}
              autoFocus
            />
            <ScrollArea className="h-72 rounded-xl border border-border p-2">
              <div className="space-y-1">
                {newMessageRecipients.map((user) => {
                  const label = user.name ?? user.email ?? `User ${user.id}`;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setNewMsgOpen(false);
                        void openDirectThread(user.id);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/40"
                    >
                      <span className="min-w-0 truncate text-sm">{label}</span>
                      {user.email ? (
                        <span className="shrink-0 truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {!newMessageRecipients.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No people found.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create group dialog */}
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {groupCategoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
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
              <Button variant="outline" onClick={() => setGroupModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreateGroup()}
                disabled={
                  isCreatingGroup || !newGroupName.trim() || !selectedMemberIds.length
                }
              >
                {isCreatingGroup ? "Creating..." : "Create group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage group members dialog */}
      <Dialog
        open={manageGroupMembersOpen}
        onOpenChange={setManageGroupMembersOpen}
      >
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
    </>
  );
}

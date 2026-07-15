"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateChatGroupMutation,
  useCreateMediaUploadUrlMutation,
  useDeleteMessageMutation,
  useEditMessageMutation,
  useGetMessagesQuery,
  useMarkThreadReadMutation,
  useSendMessageMutation,
  useToggleMessageReactionMutation,
} from "@/lib/apiSlice";
import { toast } from "../../../lib/toast";
import { ChatComposer } from "./chat-composer";
import { TenorPickerDialog } from "./tenor-picker-dialog";
import { ThreadMessageList } from "./thread-message-list";
import { GroupThreadPane } from "./group-thread-pane";
import { SplitPaneShell } from "./split-pane-shell";
import { useDebouncedValue } from "./use-debounced-value";
import type { ChatGroupItem, ChatMessage, ChatReaction, MessagingUser } from "./types";
import type { DirectLiveHandlers, GroupLiveHandlers, GifResult, ThreadListItem } from "./messaging-utils";
import {
  EMPTY_TYPING_SET,
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
import { Skeleton } from "../../ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";
import { cleanPreview, initials } from "./messaging-utils";
import { formatPresence } from "@/lib/last-seen";

type GifApiResponse = {
  error?: string;
  results?: GifResult[];
};

/** Idle gap after the last keystroke before the peer's "Typing…" is retracted. */
const TYPING_IDLE_MS = 2_500;

type InboxTabProps = {
  threads: ThreadListItem[];
  groups: ChatGroupItem[];
  users: MessagingUser[];
  typingUserIds: ReadonlySet<number>;
  onTypingChange: (toUserId: number, isTyping: boolean) => void;
  groupTypingUserIds: ReadonlyMap<number, ReadonlySet<number>>;
  onGroupTypingChange: (groupId: number, isTyping: boolean) => void;
  currentUserId: number | null;
  resolveUserName: (userId: number) => string;
  formatTime: (value?: string | null) => string;
  scheduleInboxRefetch: (delayMs?: number) => void;
  refetchInbox: () => void;
  isInboxLoading: boolean;
  isInboxError: boolean;
  highlightedInboxThreadUserId: number | null;
  highlightedInboxGroupId: number | null;
  setHighlightedInboxGroupId: (id: number | null) => void;
  requestedGroupId: number | null;
  onRequestedGroupHandled: () => void;
  registerDirectLiveHandlers: (handlers: DirectLiveHandlers | null) => void;
  registerGroupLiveHandlers: (handlers: GroupLiveHandlers | null) => void;
};

export function InboxTab({
  threads,
  groups,
  users,
  typingUserIds,
  onTypingChange,
  groupTypingUserIds,
  onGroupTypingChange,
  currentUserId,
  resolveUserName,
  formatTime,
  scheduleInboxRefetch,
  refetchInbox,
  isInboxLoading,
  isInboxError,
  highlightedInboxThreadUserId,
  highlightedInboxGroupId,
  setHighlightedInboxGroupId,
  requestedGroupId,
  onRequestedGroupHandled,
  registerDirectLiveHandlers,
  registerGroupLiveHandlers,
}: InboxTabProps) {
  const [threadUserId, setThreadUserId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [directMessage, setDirectMessage] = useState("");
  const [directReplyTo, setDirectReplyTo] = useState<{
    messageId: number;
    preview: string;
  } | null>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<"direct" | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number | null>(null);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [directReactionOverrides, setDirectReactionOverrides] = useState<
    Record<number, ChatReaction[]>
  >({});
  const [pendingDirectMessages, setPendingDirectMessages] = useState<ChatMessage[]>([]);
  const [liveDirectMessages, setLiveDirectMessages] = useState<ChatMessage[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState<
    "announcement" | "coach_group" | "team"
  >("coach_group");
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsgQuery, setNewMsgQuery] = useState("");
  const [listQuery, setListQuery] = useState("");

  const threadRowRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const groupRowRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const activeThreadUserIdRef = useRef<number | null>(null);
  const directRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sendDirect, { isLoading: isSendingDirect }] = useSendMessageMutation();
  const [markThreadRead] = useMarkThreadReadMutation();
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateChatGroupMutation();
  const [toggleDirectReaction] = useToggleMessageReactionMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [editMessage] = useEditMessageMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();

  const {
    data: directMessagesData,
    isLoading: isDirectMessagesLoading,
    isError: isDirectMessagesError,
    refetch: refetchDirectMessages,
  } = useGetMessagesQuery(threadUserId ?? skipToken);

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

  const activeThread = useMemo(
    () => threads.find((thread) => thread.userId === threadUserId) ?? null,
    [threads, threadUserId],
  );

  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    if (activeThreadUserIdRef.current)
      onTypingChange(activeThreadUserIdRef.current, false);
  }, [onTypingChange]);

  const handleDirectDraftChange = useCallback(
    (value: string) => {
      setDirectMessage(value);
      const peerUserId = activeThreadUserIdRef.current;
      if (!peerUserId) return;

      if (!value.trim()) {
        stopTyping();
        return;
      }
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTypingChange(peerUserId, true);
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
    },
    [onTypingChange, stopTyping],
  );

  // Leaving the thread — or the page — must retract a typing indicator the peer is still showing.
  useEffect(() => stopTyping, [threadUserId, stopTyping]);

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

  const debouncedListQuery = useDebouncedValue(listQuery);
  const debouncedGroupMemberQuery = useDebouncedValue(groupMemberQuery);
  const debouncedNewMsgQuery = useDebouncedValue(newMsgQuery);

  const filteredThreads = useMemo(() => {
    const q = debouncedListQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        cleanPreview(t.preview).toLowerCase().includes(q)
      );
    });
  }, [threads, debouncedListQuery]);

  const filteredGroupList = useMemo(() => {
    const q = debouncedListQuery.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter((g) => String(g.name ?? "").toLowerCase().includes(q));
  }, [allGroups, debouncedListQuery]);

  const filteredGroupMembers = useMemo(() => {
    const query = debouncedGroupMemberQuery.trim().toLowerCase();
    if (!query) return chatEligibleUsers;
    return chatEligibleUsers.filter((user) => {
      const name = String(user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [chatEligibleUsers, debouncedGroupMemberQuery]);

  const newMessageRecipients = useMemo(() => {
    const query = debouncedNewMsgQuery.trim().toLowerCase();
    const base = [...chatEligibleUsers].sort((a, b) =>
      String(a.name ?? a.email ?? "").localeCompare(String(b.name ?? b.email ?? "")),
    );
    if (!query) return base;
    return base.filter((user) => {
      const name = String(user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [chatEligibleUsers, debouncedNewMsgQuery]);

  // Sync refs
  useEffect(() => {
    activeThreadUserIdRef.current = threadUserId;
  }, [threadUserId]);

  useEffect(() => {
    setLiveDirectMessages([]);
    setPendingDirectMessages([]);
  }, [threadUserId]);

  // Timer cleanup
  useEffect(() => {
    return () => {
      if (directRefetchTimerRef.current) clearTimeout(directRefetchTimerRef.current);
    };
  }, []);

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

  // Register direct live handlers on mount, unregister on unmount
  useEffect(() => {
    registerDirectLiveHandlers({
      onDirectMessage: (message: ChatMessage) => {
        setLiveDirectMessages((current) =>
          current.some((msg) => Number(msg.id) === Number(message.id))
            ? current
            : [...current, message],
        );
      },
      onDirectReaction: (messageId: number, reactions: ChatReaction[]) => {
        setDirectReactionOverrides((current) => ({
          ...current,
          [messageId]: reactions,
        }));
      },
      getActiveThreadUserId: () => activeThreadUserIdRef.current,
      scheduleDirectRefetch,
    });
    return () => {
      registerDirectLiveHandlers(null);
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

  const sendPendingDirectMessage = async (pendingId: number, content: string) => {
    if (!threadUserId) return;
    setPendingDirectMessages((current) =>
      current.map((message) =>
        Number(message.id) === pendingId ? { ...message, localStatus: "sending" } : message,
      ),
    );
    try {
      const result = (await sendDirect({
        userId: threadUserId,
        content,
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
        current.map((message) =>
          Number(message.id) === pendingId ? { ...message, localStatus: "failed" } : message,
        ),
      );
      toast.error("Failed", "Could not send message.");
    }
  };

  const handleSendDirect = async () => {
    if (!threadUserId || !directMessage.trim()) return;
    stopTyping();
    const pendingId = -Date.now();
    const content = directMessage.trim();
    const pendingMsg: ChatMessage = {
      id: pendingId,
      senderId: currentUserId ?? 0,
      receiverId: threadUserId,
      content,
      contentType: "text",
      createdAt: new Date().toISOString(),
      reactions: [],
      localStatus: "sending",
    };
    setPendingDirectMessages((current) => [...current, pendingMsg]);
    setDirectMessage("");
    await sendPendingDirectMessage(pendingId, content);
  };

  const handleRetryDirect = (message: ChatMessage) => {
    const pendingId = Number(message.id);
    if (!Number.isFinite(pendingId)) return;
    void sendPendingDirectMessage(pendingId, String(message.content ?? ""));
  };

  const uploadAndSendMedia = async (file: File) => {
    if (!threadUserId) return;

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
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setMediaUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed."));
        };
        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.open("PUT", presign.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

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
    } catch {
      toast.error("Failed", "Could not upload media.");
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(null);
      setActiveUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openFilePicker = (accept: string) => {
    setActiveUploadTarget("direct");
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const openGifPicker = () => {
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
    if (!threadUserId) return;
    try {
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
      setGifDialogOpen(false);
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

  const activeGroupName = groups.find((g) => g.id === groupId)?.name ?? "Group chat";

  return (
    <>
      {/* Split-pane messaging layout */}
      <SplitPaneShell
        isDetailOpen={threadUserId != null || groupId != null}
        list={
          <>
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
                aria-label="Search conversations"
                className="h-8 bg-muted/50 pl-8 text-sm border-transparent focus-visible:border-border focus-visible:bg-background focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Unified conversation list */}
          <ScrollArea className="flex-1">
            <div className="py-1">
              {isInboxLoading ? (
                <div className="space-y-2 px-3 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={`thread-skel-${i}`} className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : isInboxError ? (
                <div className="mx-3 my-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-destructive">Could not load conversations.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => refetchInbox()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
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
                  <div className="relative shrink-0">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
                      thread.unread > 0
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {initials(thread.name)}
                    </div>
                    {thread.online ? (
                      <span
                        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
                        aria-label={`${thread.name} is online`}
                      />
                    ) : null}
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
                      {typingUserIds.has(thread.userId) ? (
                        <p className="truncate text-xs font-medium text-primary">Typing…</p>
                      ) : (
                        <p className={`truncate text-xs ${thread.unread > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>
                          {cleanPreview(thread.preview)}
                        </p>
                      )}
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
                </>
              )}
            </div>
          </ScrollArea>
          </>
        }
        detail={
          <>
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
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {initials(directThreadName || "U")}
                  </div>
                  {activeThread?.online ? (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{directThreadName || "Conversation"}</p>
                  <p className={`text-xs ${activeThread?.online ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {typingUserIds.has(threadUserId)
                      ? "Typing…"
                      : formatPresence(
                          Boolean(activeThread?.online),
                          activeThread?.lastSeenAt ?? null,
                        )}
                  </p>
                </div>
              </div>
              {/* Messages */}
              <div className="min-h-0 flex-1">
                {isDirectMessagesLoading && !directMessages.length ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton
                        key={`direct-msg-skel-${i}`}
                        className={`h-10 rounded-2xl ${i % 2 ? "ml-auto w-2/5" : "w-1/2"}`}
                      />
                    ))}
                  </div>
                ) : isDirectMessagesError && !directMessages.length ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm font-medium text-destructive">Could not load this conversation.</p>
                    <Button size="sm" variant="outline" onClick={() => refetchDirectMessages()}>
                      Retry
                    </Button>
                  </div>
                ) : (
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
                    onRetrySend={handleRetryDirect}
                    formatTime={formatTime}
                    currentUserId={currentUserId}
                    resolveUserName={resolveUserName}
                    mode="direct"
                    directPeerUserId={threadUserId}
                    directPeerName={directThreadName}
                    emptyLabel="No messages yet."
                  />
                )}
              </div>
              {/* Composer */}
              <ChatComposer
                value={directMessage}
                onChange={handleDirectDraftChange}
                placeholder="Message"
                onSend={() => void handleSendDirect()}
                canSend={Boolean(threadUserId && directMessage.trim())}
                isSending={isSendingDirect}
                isUploading={isUploadingMedia}
                uploadProgress={mediaUploadProgress}
                replyingTo={directReplyTo ? { preview: directReplyTo.preview } : null}
                onCancelReply={() => setDirectReplyTo(null)}
                onPickPhoto={() => openFilePicker("image/*")}
                onPickVideo={() => openFilePicker("video/*")}
                onPickGif={() => openGifPicker()}
              />
            </>
          ) : groupId != null ? (
            <GroupThreadPane
              groupId={groupId}
              groupName={activeGroupName}
              currentUserId={currentUserId}
              users={users}
              resolveUserName={resolveUserName}
              formatTime={formatTime}
              scheduleInboxRefetch={scheduleInboxRefetch}
              refetchInbox={refetchInbox}
              typingUserIds={groupTypingUserIds.get(groupId) ?? EMPTY_TYPING_SET}
              onTypingChange={(isTyping: boolean) => onGroupTypingChange(groupId, isTyping)}
              registerGroupLiveHandlers={registerGroupLiveHandlers}
              onBack={() => setGroupId(null)}
            />
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
          </>
        }
      />

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
              aria-label="Search people by name or email"
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
              aria-label="Group name"
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
              aria-label="Search group members"
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
          void uploadAndSendMedia(file);
        }}
      />
    </>
  );
}

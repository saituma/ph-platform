"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAddChatGroupMembersMutation,
  useCreateMediaUploadUrlMutation,
  useDeleteGroupMessageMutation,
  useEditGroupMessageMutation,
  useGetChatGroupMembersQuery,
  useGetChatGroupMessagesQuery,
  useMarkChatGroupReadMutation,
  useSendChatGroupMessageMutation,
  useToggleChatGroupMessageReactionMutation,
} from "@/lib/apiSlice";
import { getOrCreateAdminSocket } from "@/lib/admin-socket";
import { toast } from "../../../lib/toast";
import { ChatComposer } from "./chat-composer";
import { TenorPickerDialog } from "./tenor-picker-dialog";
import { ThreadMessageList } from "./thread-message-list";
import type { ChatMessage, ChatReaction, MessagingUser } from "./types";
import type { GifResult, GroupLiveHandlers } from "./messaging-utils";
import { ChevronLeft } from "lucide-react";
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

type GifApiResponse = {
  error?: string;
  results?: GifResult[];
};

type GroupThreadPaneProps = {
  groupId: number;
  groupName: string;
  currentUserId: number | null;
  users: MessagingUser[];
  resolveUserName: (userId: number) => string;
  formatTime: (value?: string | null) => string;
  scheduleInboxRefetch: (delayMs?: number) => void;
  refetchInbox: () => void;
  registerGroupLiveHandlers: (handlers: GroupLiveHandlers | null) => void;
  onBack?: () => void;
};

export function GroupThreadPane({
  groupId,
  groupName,
  currentUserId,
  users,
  resolveUserName,
  formatTime,
  scheduleInboxRefetch,
  refetchInbox,
  registerGroupLiveHandlers,
  onBack,
}: GroupThreadPaneProps) {
  const [groupMessage, setGroupMessage] = useState("");
  const [groupReplyTo, setGroupReplyTo] = useState<{ messageId: number; preview: string } | null>(null);
  const [groupReactionOverrides, setGroupReactionOverrides] = useState<Record<number, ChatReaction[]>>({});
  const [pendingGroupMessages, setPendingGroupMessages] = useState<ChatMessage[]>([]);
  const [liveGroupMessages, setLiveGroupMessages] = useState<ChatMessage[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageMemberQuery, setManageMemberQuery] = useState("");
  const [manageSelectedMemberIds, setManageSelectedMemberIds] = useState<number[]>([]);

  const activeGroupIdRef = useRef<number | null>(null);
  const groupRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sendGroup, { isLoading: isSendingGroup }] = useSendChatGroupMessageMutation();
  const [markChatGroupRead] = useMarkChatGroupReadMutation();
  const [toggleGroupReaction] = useToggleChatGroupMessageReactionMutation();
  const [deleteGroupMessage] = useDeleteGroupMessageMutation();
  const [editGroupMessage] = useEditGroupMessageMutation();
  const [addChatGroupMembers, { isLoading: isAddingGroupMembers }] = useAddChatGroupMembersMutation();
  const [createMediaUploadUrl] = useCreateMediaUploadUrlMutation();

  const { data: groupMessagesData, refetch: refetchGroupMessages } = useGetChatGroupMessagesQuery(groupId);
  const { data: groupMembersData } = useGetChatGroupMembersQuery(manageOpen ? groupId : skipToken);

  const chatEligibleUsers = useMemo(
    () => users.filter((u) => u?.role !== "admin" && u?.role !== "superAdmin" && u?.role !== "coach"),
    [users],
  );

  const existingManageMemberIds = useMemo<number[]>(
    () =>
      (
        (groupMembersData as { members?: Array<{ userId?: number | string }> } | undefined)
          ?.members ?? []
      )
        .map((m) => Number(m.userId))
        .filter((id) => Number.isFinite(id)),
    [groupMembersData],
  );

  const filteredManageMembers = useMemo(() => {
    const q = manageMemberQuery.trim().toLowerCase();
    return chatEligibleUsers.filter((user) => {
      if (existingManageMemberIds.includes(user.id)) return false;
      if (!q) return true;
      return (
        String(user.name ?? "").toLowerCase().includes(q) ||
        String(user.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [chatEligibleUsers, existingManageMemberIds, manageMemberQuery]);

  const groupMessages = useMemo<ChatMessage[]>(() => {
    const base = (groupMessagesData?.messages as ChatMessage[] | undefined) ?? [];
    const merged = [...base, ...liveGroupMessages, ...pendingGroupMessages];
    const uniqueById = new Map<number, ChatMessage>();
    for (const msg of merged) {
      const id = Number(msg.id);
      if (!Number.isFinite(id)) continue;
      uniqueById.set(id, msg);
    }
    return [...uniqueById.values()]
      .sort(
        (a, b) =>
          new Date(String(a.createdAt ?? "")).getTime() -
          new Date(String(b.createdAt ?? "")).getTime(),
      )
      .map((msg) => {
        const id = Number(msg.id);
        if (!Number.isFinite(id)) return msg;
        const reactions = groupReactionOverrides[id];
        return reactions ? { ...msg, reactions } : msg;
      });
  }, [groupMessagesData, groupReactionOverrides, liveGroupMessages, pendingGroupMessages]);

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

  useEffect(() => { activeGroupIdRef.current = groupId; }, [groupId]);
  useEffect(() => { setLiveGroupMessages([]); setPendingGroupMessages([]); }, [groupId]);
  useEffect(() => { setGroupReactionOverrides({}); }, [groupId]);

  useEffect(
    () => () => {
      if (groupRefetchTimerRef.current) clearTimeout(groupRefetchTimerRef.current);
    },
    [],
  );

  useEffect(() => {
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
    return () => { active = false; };
  }, [groupId, markChatGroupRead, scheduleInboxRefetch]);

  useEffect(() => {
    const socket = getOrCreateAdminSocket();
    if (!socket?.connected) return;
    socket.emit("group:join", { groupId });
    return () => { socket.emit("group:leave", { groupId }); };
  }, [groupId]);

  useEffect(() => {
    registerGroupLiveHandlers({
      onGroupMessage: (message: ChatMessage, incomingGroupId: number) => {
        if (
          activeGroupIdRef.current &&
          incomingGroupId === activeGroupIdRef.current &&
          Number.isFinite(Number(message.id))
        ) {
          setLiveGroupMessages((current) =>
            current.some((m) => Number(m.id) === Number(message.id))
              ? current
              : [...current, message],
          );
        }
      },
      onGroupReaction: (_incomingGroupId: number, messageId: number, reactions: ChatReaction[]) => {
        setGroupReactionOverrides((current) => ({ ...current, [messageId]: reactions }));
      },
      getActiveGroupId: () => activeGroupIdRef.current,
      scheduleGroupRefetch,
    });
    return () => { registerGroupLiveHandlers(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendGroup = async () => {
    if (!groupMessage.trim()) return;
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
      setPendingGroupMessages((current) => current.filter((m) => Number(m.id) !== pendingId));
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
      setPendingGroupMessages((current) => current.filter((m) => Number(m.id) !== pendingId));
      setGroupMessage(draft);
      toast.error("Failed", "Could not send group message.");
    }
  };

  const uploadAndSendMedia = async (file: File) => {
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
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed.")));
        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.open("PUT", presign.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });
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
    } catch {
      toast.error("Failed", "Could not upload media.");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openGifPicker = () => {
    setGifQuery("");
    setGifDialogOpen(true);
    void searchGif("");
  };

  const searchGif = async (query: string) => {
    setGifLoading(true);
    try {
      const res = await fetch(`/api/giphy/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as GifApiResponse | null;
      if (!res.ok) {
        setGifResults([]);
        toast.error("GIF search unavailable", payload?.error ?? "Could not load GIFs right now.");
        return;
      }
      setGifResults(Array.isArray(payload?.results) ? payload.results : []);
    } catch {
      setGifResults([]);
      toast.error("GIF search unavailable", "Could not load GIFs right now.");
    } finally {
      setGifLoading(false);
    }
  };

  const sendGif = async (gifUrl: string) => {
    try {
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
      setGifDialogOpen(false);
    } catch {
      toast.error("Failed", "Could not send GIF.");
    }
  };

  const handleGroupReaction = async (messageId: number, emoji: string) => {
    if (currentUserId != null) {
      const source =
        groupReactionOverrides[messageId] ??
        groupMessages.find((m) => Number(m.id) === messageId)?.reactions ??
        [];
      const next = Array.isArray(source)
        ? source.map((r) => ({ ...r, userIds: [...(r.userIds ?? [])] }))
        : [];
      const existingIdx = next.findIndex((r) => Array.isArray(r.userIds) && r.userIds.includes(currentUserId));
      if (existingIdx >= 0) {
        const existing = next[existingIdx];
        if (existing.emoji === emoji) {
          existing.userIds = existing.userIds!.filter((id) => id !== currentUserId);
          existing.count = existing.userIds.length;
        } else {
          existing.userIds = existing.userIds!.filter((id) => id !== currentUserId);
          existing.count = existing.userIds.length;
          const targetIdx = next.findIndex((r) => r.emoji === emoji);
          if (targetIdx >= 0) {
            const target = next[targetIdx];
            if (!target.userIds?.includes(currentUserId)) target.userIds = [...(target.userIds ?? []), currentUserId];
            target.count = target.userIds!.length;
          } else {
            next.push({ emoji, count: 1, userIds: [currentUserId] });
          }
        }
      } else {
        const targetIdx = next.findIndex((r) => r.emoji === emoji);
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
        [messageId]: next.filter((r) => Number(r.count ?? 0) > 0),
      }));
    }
    try {
      const result = await toggleGroupReaction({ groupId, messageId, emoji }).unwrap();
      if (Array.isArray(result?.reactions)) {
        setGroupReactionOverrides((current) => ({ ...current, [messageId]: result.reactions as ChatReaction[] }));
      }
    } catch {
      scheduleGroupRefetch(60);
      toast.error("Failed", "Could not update reaction.");
    }
  };

  const handleAddMembersToGroup = async () => {
    if (!manageSelectedMemberIds.length) return;
    try {
      await addChatGroupMembers({ groupId, memberIds: [...new Set(manageSelectedMemberIds)] }).unwrap();
      toast.success("Members added", "Selected members were added to the group.");
      setManageOpen(false);
      setManageSelectedMemberIds([]);
      setManageMemberQuery("");
    } catch {
      toast.error("Failed", "Could not add members to this group.");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        {onBack ? (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted lg:hidden"
            onClick={onBack}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
          {String(groupName).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{groupName}</p>
          <p className="text-xs text-muted-foreground">Group thread</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-xs"
          onClick={() => { setManageOpen(true); setManageSelectedMemberIds([]); setManageMemberQuery(""); }}
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
          onDelete={(messageId) => void deleteGroupMessage({ groupId, messageId }).catch(() => {})}
          onEdit={(messageId, content) => void editGroupMessage({ groupId, messageId, content }).catch(() => {})}
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
        canSend={Boolean(groupMessage.trim())}
        isSending={isSendingGroup}
        isUploading={isUploadingMedia}
        replyingTo={groupReplyTo ? { preview: groupReplyTo.preview } : null}
        onCancelReply={() => setGroupReplyTo(null)}
        onPickPhoto={() => {
          if (!fileInputRef.current) return;
          fileInputRef.current.accept = "image/*";
          fileInputRef.current.click();
        }}
        onPickVideo={() => {
          if (!fileInputRef.current) return;
          fileInputRef.current.accept = "video/*";
          fileInputRef.current.click();
        }}
        onPickGif={() => openGifPicker()}
      />

      {/* Manage members dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>{groupName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search members..."
              value={manageMemberQuery}
              onChange={(e) => setManageMemberQuery(e.target.value)}
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
              <Button variant="outline" onClick={() => setManageOpen(false)}>Cancel</Button>
              <Button
                onClick={() => void handleAddMembersToGroup()}
                disabled={isAddingGroupMembers || !manageSelectedMemberIds.length}
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void uploadAndSendMedia(file);
        }}
      />
    </>
  );
}

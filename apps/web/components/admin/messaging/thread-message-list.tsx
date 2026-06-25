"use client";

import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { ArrowDown, CornerUpLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { Dialog, DialogContent } from "../../ui/dialog";
import { ScrollArea } from "../../ui/scroll-area";
import type { ChatMessage, ChatReaction } from "./types";
import { OpenGraphPreview } from "./open-graph-preview";

type EmojiPick = {
  native?: string;
};

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

type ThreadMessageListProps = {
  messages: ChatMessage[];
  onReact: (messageId: number, emoji: string) => void;
  onReply?: (payload: { messageId: number; preview: string }) => void;
  onDelete?: (messageId: number) => void;
  onEdit?: (messageId: number, content: string) => void;
  formatTime: (value?: string | null) => string;
  currentUserId?: number | null;
  resolveUserName?: (userId: number) => string;
  mode?: "direct" | "group";
  directPeerUserId?: number | null;
  directPeerName?: string | null;
  showSenderName?: boolean;
  emptyLabel: string;
  openScrollKey?: string | number | null;
};

function isMessageFromCurrentUser(params: {
  message: ChatMessage;
  currentUserId?: number | null;
  mode: "direct" | "group";
  directPeerUserId?: number | null;
}) {
  const { message, currentUserId, mode, directPeerUserId } = params;
  const senderId = Number(message?.senderId ?? NaN);
  const receiverId = Number(message?.receiverId ?? NaN);
  const normalizedRole = String(message?.senderRole ?? "")
    .trim()
    .toLowerCase();

  if (currentUserId != null && Number.isFinite(senderId)) {
    return senderId === currentUserId;
  }
  if (
    currentUserId != null &&
    Number.isFinite(receiverId) &&
    mode === "direct"
  ) {
    return receiverId !== currentUserId;
  }
  if (
    mode === "direct" &&
    directPeerUserId != null &&
    Number.isFinite(senderId)
  ) {
    return senderId !== directPeerUserId;
  }
  if (
    mode === "direct" &&
    directPeerUserId != null &&
    Number.isFinite(receiverId)
  ) {
    return receiverId === directPeerUserId;
  }
  if (
    currentUserId == null &&
    (normalizedRole === "admin" ||
      normalizedRole === "coach" ||
      normalizedRole === "superadmin")
  ) {
    return true;
  }
  return false;
}

export function ThreadMessageList({
  messages,
  onReact,
  onReply,
  onDelete,
  onEdit,
  formatTime,
  currentUserId,
  resolveUserName,
  mode = "direct",
  directPeerUserId = null,
  showSenderName = false,
  emptyLabel,
  openScrollKey = null,
}: ThreadMessageListProps) {
  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingPreview, setDeletingPreview] = useState<string>("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    number | null
  >(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const path =
        typeof event.composedPath === "function"
          ? event.composedPath()
          : [];
      const clickedInsideReactionPicker = path.some((node) => {
        if (!(node instanceof HTMLElement)) return false;
        if (node.closest('[data-reaction-picker-root="true"]')) return true;
        // Emoji Mart renders nested custom elements; keep picker open for those.
        const tag = node.tagName?.toLowerCase?.() ?? "";
        return tag.startsWith("em-");
      });
      if (clickedInsideReactionPicker) return;
      setPickerMessageId(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const getViewport = useCallback(() => {
    const root = scrollContainerRef.current;
    if (!root) return null;
    return (
      (root.querySelector(
        '[data-slot="scroll-area-viewport"]',
      ) as HTMLDivElement | null) ??
      (root.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLDivElement | null)
    );
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const viewport = getViewport();
      if (!viewport) return;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    },
    [getViewport],
  );

  const scrollToBottomWithRetry = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const run = (delay: number, nextBehavior: ScrollBehavior) => {
        window.setTimeout(() => {
          scrollToBottom(nextBehavior);
        }, delay);
      };
      run(0, behavior);
      run(80, "auto");
      run(220, "auto");
    },
    [scrollToBottom],
  );

  useEffect(() => {
    if (!openScrollKey) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      scrollToBottom("auto");
      if (attempts >= 15) {
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [openScrollKey, scrollToBottom]);

  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const onScroll = () => {
      const threshold = 90;
      const distanceToBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const nextIsNearBottom = distanceToBottom < threshold;
      isNearBottomRef.current = nextIsNearBottom;
      setIsNearBottom(nextIsNearBottom);
      if (nextIsNearBottom) {
        // When the user is at (or near) the bottom, consider the latest message "seen".
        setLastSeenMessageId(lastMessageIdRef.current);
      }
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [getViewport]);

  useEffect(() => {
    if (!messages.length) {
      lastMessageIdRef.current = null;
      queueMicrotask(() => setLastSeenMessageId(null));
      return;
    }
    const latest = messages[messages.length - 1];
    const latestId = String(latest.id ?? "");
    if (!latestId) return;
    const prevId = lastMessageIdRef.current;
    if (!prevId) {
      lastMessageIdRef.current = latestId;
      // initial mount should pin to bottom
      requestAnimationFrame(() => {
        scrollToBottomWithRetry("auto");
        setLastSeenMessageId(latestId);
      });
      return;
    }
    if (prevId === latestId) return;
    lastMessageIdRef.current = latestId;

    const senderId = Number(latest?.senderId ?? NaN);
    const mine =
      currentUserId != null && Number.isFinite(senderId)
        ? senderId === currentUserId
        : false;
    void mine;
    requestAnimationFrame(() => {
      if (isNearBottomRef.current) {
        scrollToBottomWithRetry("smooth");
        setLastSeenMessageId(latestId);
      }
      // if scrolled up, leave lastSeenMessageId alone so FAB count increments
    });
  }, [currentUserId, messages, scrollToBottomWithRetry]);

  const newIncomingCount = useMemo(() => {
    if (!messages.length) return 0;
    if (isNearBottom) return 0;

    if (!lastSeenMessageId) return 0;

    const lastSeenIdx = messages.findIndex(
      (m) => String(m.id ?? "") === lastSeenMessageId,
    );
    const startIdx = lastSeenIdx >= 0 ? lastSeenIdx + 1 : 0;
    const unseen = messages.slice(startIdx);

    let count = 0;
    for (const msg of unseen) {
      const senderId = Number(msg?.senderId ?? NaN);
      const mine =
        currentUserId != null && Number.isFinite(senderId)
          ? senderId === currentUserId
          : false;
      if (!mine) count += 1;
    }

    return Math.min(count, 99);
  }, [currentUserId, isNearBottom, lastSeenMessageId, messages]);

  const handlePickReaction = async (message: ChatMessage, emoji: EmojiPick) => {
    if (!emoji.native) return;
    const messageId = Number(message.id);
    await Promise.resolve(onReact(messageId, emoji.native));
    setPickerMessageId(null);
  };

  const jumpToMessage = (messageId: number | null) => {
    if (!messageId || !Number.isFinite(messageId)) return;
    const target = document.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((current) =>
        current === messageId ? null : current,
      );
    }, 1400);
  };

  const parseMessage = (raw: string) => {
    const input = String(raw ?? "");
    const replyMatch = input.match(/^\s*\[reply:(\d+):([^\]]*)\]\s*/i);
    if (!replyMatch) {
      return {
        replyToId: null as number | null,
        replyPreview: "",
        text: input,
      };
    }
    const replyToId = Number(replyMatch[1]);
    const encodedPreview = replyMatch[2] ?? "";
    let replyPreview = "";
    try {
      replyPreview = decodeURIComponent(encodedPreview);
    } catch {
      replyPreview = encodedPreview;
    }
    const text = input.slice(replyMatch[0].length);
    return {
      replyToId: Number.isFinite(replyToId) ? replyToId : null,
      replyPreview,
      text,
    };
  };

  const extractFirstUrl = (value: string) => {
    const input = String(value ?? "");
    const matches = input.match(/https?:\/\/[^\s]+/gi) ?? [];
    const cleaned = matches
      .map((url) => url.replace(/[)\].,!?;:]+$/g, ""))
      .filter((url) => /^https?:\/\//i.test(url));
    return cleaned[0] ?? null;
  };

  const messageById = useMemo(() => {
    const map = new Map<number, ChatMessage>();
    messages.forEach((item) => {
      const id = Number(item.id);
      if (Number.isFinite(id)) map.set(id, item);
    });
    return map;
  }, [messages]);

  const downArrowLabel = useMemo(() => {
    if (newIncomingCount <= 0) return "";
    return newIncomingCount > 99 ? "99+" : String(newIncomingCount);
  }, [newIncomingCount]);

  const messagesWithSeparators = useMemo(() => {
    const result: Array<
      | { type: "message"; message: ChatMessage }
      | { type: "separator"; label: string }
    > = [];
    let lastDate = "";
    for (const msg of messages) {
      const dateLabel = formatDateLabel(msg.createdAt);
      if (dateLabel && dateLabel !== lastDate) {
        result.push({ type: "separator", label: dateLabel });
        lastDate = dateLabel;
      }
      result.push({ type: "message", message: msg });
    }
    return result;
  }, [messages]);

  return (
    <div ref={scrollContainerRef} className="relative">
      <ScrollArea className="h-105 rounded-xl border border-border p-3">
        <div className="space-y-3">
          {messagesWithSeparators.map((item) => {
            if (item.type === "separator") {
              return (
                <div key={`sep-${item.label}`} className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              );
            }
            const message = item.message;
            const senderId = Number(message?.senderId ?? NaN);
            const mine = isMessageFromCurrentUser({
              message,
              currentUserId,
              mode,
              directPeerUserId,
            });
            const reactions: ChatReaction[] = Array.isArray(message?.reactions)
              ? message.reactions
              : [];
            const hasImage = Boolean(
              message.mediaUrl && message.contentType === "image",
            );
            const hasVideo = Boolean(
              message.mediaUrl && message.contentType === "video",
            );
            const hasMedia = hasImage || hasVideo;
            const parsed = parseMessage(String(message.content ?? ""));
            const normalizedText = String(parsed.text ?? "")
              .trim()
              .toLowerCase();
            const hidePlaceholderText =
              normalizedText === "attachment" ||
              normalizedText.startsWith("file attached:");
            const showText = Boolean(parsed.text && !hidePlaceholderText);
            const firstUrl = showText
              ? extractFirstUrl(String(parsed.text ?? ""))
              : null;
            const mediaOnly = hasMedia && !showText;
            const senderLabel =
              message.senderName?.trim() ||
              (Number.isFinite(senderId) && resolveUserName
                ? resolveUserName(senderId)
                : "") ||
              "Unknown user";
            const avatarUrl = String(message.senderProfilePicture ?? "").trim();
            const avatarFallback = getInitials(senderLabel);
            const repliedMessage = parsed.replyToId
              ? messageById.get(parsed.replyToId)
              : undefined;
            const repliedParsed = repliedMessage
              ? parseMessage(String(repliedMessage.content ?? ""))
              : null;
            const repliedSenderLabel = repliedMessage
              ? String(
                  repliedMessage.senderName?.trim() ||
                    (Number.isFinite(Number(repliedMessage.senderId)) &&
                    resolveUserName
                      ? resolveUserName(Number(repliedMessage.senderId))
                      : "") ||
                    "",
                ).trim()
              : "";
            const replySnippet =
              parsed.replyPreview ||
              repliedParsed?.text?.trim() ||
              (parsed.replyToId ? `Message #${parsed.replyToId}` : "");
            const canJumpToReply =
              parsed.replyToId != null && Number.isFinite(parsed.replyToId);
            return (
              <div
                key={message.id}
                data-message-id={Number(message.id)}
                className={`group flex w-full ${mine ? "justify-end" : "justify-start"} ${
                  highlightedMessageId === Number(message.id)
                    ? "rounded-xl ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
                    : ""
                }`}
              >
                <div
                  className={`flex max-w-[88%] items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/15 text-[10px] font-semibold text-primary">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={senderLabel}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="select-none">{avatarFallback}</span>
                    )}
                  </div>

                  <div
                    className={`space-y-2 rounded-xl px-3 py-2 ${
                      mediaOnly
                        ? "bg-transparent px-0 py-0 shadow-none"
                        : mine
                          ? "bg-primary/10 text-primary"
                          : hasMedia
                            ? "bg-secondary text-foreground"
                            : "border border-border bg-secondary text-foreground"
                    }`}
                  >
                    {showSenderName ? (
                      <p className="text-xs opacity-80">{senderLabel}</p>
                    ) : null}
                    {replySnippet ? (
                      canJumpToReply ? (
                        <button
                          type="button"
                          onClick={() => jumpToMessage(parsed.replyToId)}
                          className="w-full border-l-2 border-primary/40 pl-2 text-left text-xs text-muted-foreground"
                          aria-label="Jump to replied message"
                          title="Jump to replied message"
                        >
                          {repliedSenderLabel ? (
                            <p
                              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {repliedSenderLabel}
                            </p>
                          ) : null}
                          <p>{replySnippet}</p>
                        </button>
                      ) : (
                        <div
                          className="w-full border-l-2 border-primary/40 pl-2 text-left text-xs text-muted-foreground"
                        >
                          {repliedSenderLabel ? (
                            <p
                              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {repliedSenderLabel}
                            </p>
                          ) : null}
                          <p>{replySnippet}</p>
                        </div>
                      )
                    ) : null}
                    {hasImage ? (
                      <button
                        type="button"
                        className="mt-2 block w-full cursor-zoom-in"
                        onClick={() => setLightboxUrl(message.mediaUrl ?? "")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={message.mediaUrl ?? ""}
                          alt={message.content ?? "Image"}
                          className={`rounded-lg ${mediaOnly ? "max-h-105 w-auto max-w-full object-contain" : "max-h-64 w-full object-cover"}`}
                        />
                      </button>
                    ) : null}
                    {hasVideo ? (
                      <video
                        src={message.mediaUrl ?? ""}
                        controls
                        className={`rounded-lg ${mediaOnly ? "max-h-105 w-auto max-w-full" : "max-h-64 w-full"}`}
                      />
                    ) : null}
                    {editingId === Number(message.id) ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          rows={3}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") { setEditingId(null); setEditDraft(""); }
                            if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
                              e.preventDefault();
                              const t = editDraft.trim();
                              if (t) onEdit?.(Number(message.id), t);
                              setEditingId(null); setEditDraft("");
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            onClick={() => { const t = editDraft.trim(); if (t) onEdit?.(Number(message.id), t); setEditingId(null); setEditDraft(""); }}
                          >Save</button>
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
                            onClick={() => { setEditingId(null); setEditDraft(""); }}
                          >Cancel</button>
                        </div>
                      </div>
                    ) : showText ? (
                      <p className="whitespace-pre-wrap text-sm">
                        {parsed.text}
                      </p>
                    ) : null}
                    {firstUrl ? <OpenGraphPreview url={firstUrl} /> : null}
                    <div
                      className={`mt-1 flex items-center gap-2 text-[10px] ${mine && !mediaOnly ? "text-primary/70" : "text-muted-foreground"}`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      {message.localStatus === "sending" ? (
                        <span className="animate-pulse">Sending...</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div
                  data-reaction-picker-root="true"
                  className={`relative flex items-end gap-1 ${mine ? "mr-0 ml-2" : "ml-0 mr-2"} self-end opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100`}
                >
                  {onEdit && !hasMedia && editingId !== Number(message.id) ? (
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-secondary"
                      onClick={() => { setEditingId(Number(message.id)); setEditDraft(String(parsed.text ?? "")); setPickerMessageId(null); }}
                      aria-label="Edit message"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      onClick={() => {
                        setDeletingId(Number(message.id));
                        setDeletingPreview((message.content ?? "").slice(0, 80));
                      }}
                      aria-label="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {onReply ? (
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-secondary"
                      onClick={() => {
                        const defaultPreview =
                          parsed.text?.trim() ||
                          (hasMedia ? "Media message" : "Message");
                        onReply({
                          messageId: Number(message.id),
                          preview: defaultPreview.slice(0, 160),
                        });
                      }}
                      aria-label="Reply to message"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="flex h-7 min-w-7 items-center justify-center rounded-full border border-border bg-background px-1.5 text-xs shadow-sm hover:bg-secondary"
                    onClick={() => {
                      setPickerMessageId((current) =>
                        current === String(message.id)
                          ? null
                          : String(message.id),
                      );
                    }}
                    aria-label="Add custom reaction"
                  >
                    {reactions.length ? (
                      <span className="flex items-center gap-1">
                        <span>{reactions[0].emoji}</span>
                        <span>
                          {reactions.reduce(
                            (sum, reaction) =>
                              sum + Number(reaction.count ?? 0),
                            0,
                          )}
                        </span>
                      </span>
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {pickerMessageId === String(message.id) ? (
                    <div
                      className={`absolute bottom-full mb-2 z-[1300] overflow-hidden rounded-xl border border-border bg-card shadow-lg ${mine ? "right-0" : "left-0"}`}
                    >
                      {reactions.length ? (
                        <div className="max-w-72 border-b border-border px-3 py-2 text-xs">
                          <p className="mb-1 font-semibold text-foreground">
                            Reactions
                          </p>
                          <div className="space-y-1.5">
                            {reactions.map((reaction) => {
                              const users =
                                Array.isArray(reaction.userIds) &&
                                reaction.userIds.length
                                  ? reaction.userIds.map((userId) =>
                                      resolveUserName
                                        ? resolveUserName(userId)
                                        : `User ${userId}`,
                                    )
                                  : [];
                              return (
                                <div
                                  key={`detail-${message.id}-${reaction.emoji}`}
                                  className="rounded-md bg-secondary/50 px-2 py-1"
                                >
                                  <p className="font-medium">
                                    {reaction.emoji} {reaction.count}
                                  </p>
                                  {users.length ? (
                                    <p className="truncate text-muted-foreground">
                                      {users.join(", ")}
                                    </p>
                                  ) : (
                                    <p className="text-muted-foreground">
                                      No user details
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <Picker
                        data={emojiData}
                        onEmojiSelect={(emoji: EmojiPick) =>
                          void handlePickReaction(message, emoji)
                        }
                        previewPosition="none"
                        skinTonePosition="none"
                        maxFrequentRows={1}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!messages.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-medium">{emptyLabel}</p>
              <p className="text-xs text-muted-foreground">Be the first to send a message.</p>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      {(!isNearBottom || newIncomingCount > 0) ? (
        <button
          type="button"
          onClick={() => {
            scrollToBottomWithRetry("smooth");
            isNearBottomRef.current = true;
            setIsNearBottom(true);
            setLastSeenMessageId(lastMessageIdRef.current);
          }}
          className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
          aria-label="Scroll to newest message"
        >
          <ArrowDown className="h-4 w-4" />
          {newIncomingCount > 0 ? (
            <>
              <span>New</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5">
                {downArrowLabel}
              </span>
            </>
          ) : null}
        </button>
      ) : null}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPreview ? (
                <span className="block rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground italic mb-2">
                  &ldquo;{deletingPreview}{deletingPreview.length >= 80 ? "…" : ""}&rdquo;
                </span>
              ) : null}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancel
            </AlertDialogClose>
            <button
              type="button"
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingId !== null) onDelete?.(deletingId);
                setDeletingId(null);
              }}
            >
              Delete
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={lightboxUrl !== null} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
        <DialogContent className="max-w-3xl border-none bg-black/90 p-2">
          {lightboxUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt="Full size"
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

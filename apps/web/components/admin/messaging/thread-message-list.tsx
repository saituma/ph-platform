"use client";

import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { ArrowDown, CornerUpLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ScrollArea } from "../../ui/scroll-area";
import type { ChatMessage, ChatReaction } from "./types";
import { OpenGraphPreview } from "./open-graph-preview";

type EmojiPick = {
  native?: string;
};

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
  formatTime: (value?: string | null) => string;
  currentUserId?: number | null;
  resolveUserName?: (userId: number) => string;
  mode?: "direct" | "group";
  directPeerUserId?: number | null;
  directPeerName?: string | null;
  showSenderName?: boolean;
  emptyLabel: string;
};

export function ThreadMessageList({
  messages,
  onReact,
  onReply,
  formatTime,
  currentUserId,
  resolveUserName,
  mode = "direct",
  directPeerUserId = null,
  directPeerName = null,
  showSenderName = false,
  emptyLabel,
}: ThreadMessageListProps) {
  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    number | null
  >(null);
  const [newIncomingCount, setNewIncomingCount] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-reaction-picker-root="true"]')) return;
      setPickerMessageId(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const getViewport = () => {
    const root = scrollContainerRef.current;
    if (!root) return null;
    return root.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = getViewport();
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  };

  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const onScroll = () => {
      const threshold = 90;
      const distanceToBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      isNearBottomRef.current = distanceToBottom < threshold;
      if (isNearBottomRef.current) {
        setNewIncomingCount(0);
      }
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => viewport.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!messages.length) {
      lastMessageIdRef.current = null;
      setNewIncomingCount(0);
      return;
    }
    const latest = messages[messages.length - 1];
    const latestId = String(latest.id ?? "");
    if (!latestId) return;
    const prevId = lastMessageIdRef.current;
    if (!prevId) {
      lastMessageIdRef.current = latestId;
      // initial mount should pin to bottom
      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }
    if (prevId === latestId) return;
    lastMessageIdRef.current = latestId;

    const senderId = Number(latest?.senderId ?? NaN);
    const mine = currentUserId != null && Number.isFinite(senderId) ? senderId === currentUserId : false;
    const incoming = !mine;

    if (mine || isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
      setNewIncomingCount(0);
      return;
    }
    if (incoming) {
      setNewIncomingCount((count) => Math.min(count + 1, 99));
    }
  }, [currentUserId, messages]);

  const handlePickReaction = async (message: ChatMessage, emoji: EmojiPick) => {
    if (!emoji.native) return;
    const messageId = Number(message.id);
    console.log("[Messaging][Picker] select", {
      messageId,
      emoji: emoji.native,
      reactions: message.reactions ?? [],
      currentUserId,
    });
    const myReaction =
      currentUserId == null
        ? null
        : ((Array.isArray(message.reactions) ? message.reactions : []).find(
            (reaction) =>
              Array.isArray(reaction.userIds)
                ? reaction.userIds.includes(currentUserId)
                : false,
          ) ?? null);

    if (myReaction?.emoji && myReaction.emoji !== emoji.native) {
      console.log("[Messaging][Picker] remove-old", {
        messageId,
        oldEmoji: myReaction.emoji,
      });
      await Promise.resolve(onReact(messageId, myReaction.emoji));
    }
    console.log("[Messaging][Picker] apply-new", {
      messageId,
      newEmoji: emoji.native,
    });
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

  const fileNameFromUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      return last ? decodeURIComponent(last) : "File";
    } catch {
      const parts = url.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      return last ? decodeURIComponent(last) : "File";
    }
  };

  const messageById = new Map<number, ChatMessage>();
  messages.forEach((item) => {
    const id = Number(item.id);
    if (Number.isFinite(id)) messageById.set(id, item);
  });

  const downArrowLabel = useMemo(() => {
    if (newIncomingCount <= 0) return "";
    return newIncomingCount > 99 ? "99+" : String(newIncomingCount);
  }, [newIncomingCount]);

  return (
    <div ref={scrollContainerRef} className="relative">
      <ScrollArea className="h-[420px] rounded-xl border border-border p-3">
        <div className="space-y-3">
          {messages.map((message) => {
          const senderId = Number(message?.senderId ?? NaN);
          const receiverId = Number(message?.receiverId ?? NaN);
          const normalizedRole = String(message?.senderRole ?? "")
            .trim()
            .toLowerCase();
          const normalizedSenderName = String(message?.senderName ?? "")
            .trim()
            .toLowerCase();
          const normalizedPeerName = String(directPeerName ?? "")
            .trim()
            .toLowerCase();
          const mineById =
            Number.isFinite(senderId) && currentUserId != null
              ? senderId === currentUserId
              : false;
          const mineByRole =
            currentUserId == null &&
            (normalizedRole === "admin" ||
              normalizedRole === "coach" ||
              normalizedRole === "superadmin");
          const mineByDirectPeerSender =
            mode === "direct" &&
            directPeerUserId != null &&
            Number.isFinite(senderId)
              ? senderId !== directPeerUserId
              : null;
          const mineByDirectPeerReceiver =
            mode === "direct" &&
            directPeerUserId != null &&
            Number.isFinite(receiverId)
              ? receiverId === directPeerUserId
              : null;
          const mineByDirectPeerName =
            mode === "direct" && normalizedSenderName && normalizedPeerName
              ? normalizedSenderName !== normalizedPeerName
              : null;
          let mine = false;
          if (mineByDirectPeerSender != null) {
            mine = mineByDirectPeerSender;
          } else if (mineByDirectPeerReceiver != null) {
            mine = mineByDirectPeerReceiver;
          } else if (mineById) {
            mine = true;
          } else if (mineByRole) {
            mine = true;
          } else if (mineByDirectPeerName != null) {
            mine = mineByDirectPeerName;
          }
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
          const hidePlaceholderText = normalizedText === "attachment";
          const showText = Boolean(parsed.text && !hidePlaceholderText);
          const firstUrl = showText
            ? extractFirstUrl(String(parsed.text ?? ""))
            : null;
          const mediaOnly = hasMedia && !showText;
          const attachmentName =
            hasMedia && message.mediaUrl
              ? fileNameFromUrl(message.mediaUrl)
              : normalizedText.startsWith("file attached:")
                ? parsed.text.replace(/^file attached:\s*/i, "").trim()
                : "";
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
              className={`flex w-full ${mine ? "justify-end" : "justify-start"} ${
                highlightedMessageId === Number(message.id)
                  ? "rounded-xl ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
                  : ""
              }`}
            >
              <div className={`flex max-w-[88%] items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-[10px] font-semibold text-foreground">
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
                        ? "bg-emerald-600 text-white"
                        : "border border-border bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
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
                        className={`w-full rounded-lg border px-2 py-1 text-left text-xs ${
                          mine
                            ? "border-white/30 bg-white/15 text-white/90"
                            : "border-border bg-secondary/50 text-muted-foreground"
                        }`}
                        aria-label="Jump to replied message"
                        title="Jump to replied message"
                      >
                        {repliedSenderLabel ? (
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              mine ? "text-white/80" : "text-muted-foreground"
                            }`}
                          >
                            {repliedSenderLabel}
                          </p>
                        ) : null}
                        <p>{replySnippet}</p>
                      </button>
                    ) : (
                      <div
                        className={`w-full rounded-lg border px-2 py-1 text-left text-xs ${
                          mine
                            ? "border-white/30 bg-white/15 text-white/90"
                            : "border-border bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        {repliedSenderLabel ? (
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              mine ? "text-white/80" : "text-muted-foreground"
                            }`}
                          >
                            {repliedSenderLabel}
                          </p>
                        ) : null}
                        <p>{replySnippet}</p>
                      </div>
                    )
                  ) : null}
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.mediaUrl ?? ""}
                      alt="Message media"
                      className={`rounded-lg ${mediaOnly ? "max-h-[420px] w-auto max-w-full object-contain" : "max-h-64 w-full object-cover"}`}
                    />
                  ) : null}
                  {hasVideo ? (
                    <video
                      src={message.mediaUrl ?? ""}
                      controls
                      className={`rounded-lg ${mediaOnly ? "max-h-[420px] w-auto max-w-full" : "max-h-64 w-full"}`}
                    />
                  ) : null}
                  {showText ? (
                    <p className="whitespace-pre-wrap text-sm">{parsed.text}</p>
                  ) : null}
                  {firstUrl ? <OpenGraphPreview url={firstUrl} /> : null}
                  {attachmentName && !showText ? (
                    <p
                      className={`text-xs ${mine && !mediaOnly ? "text-white/85" : "text-muted-foreground"}`}
                    >
                      {attachmentName}
                    </p>
                  ) : null}
                  <p
                    className={`mt-1 text-[10px] ${mine && !mediaOnly ? "text-white/80" : "text-muted-foreground"}`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
              <div
                data-reaction-picker-root="true"
                className={`relative flex items-end gap-1 ${mine ? "mr-0 ml-2" : "ml-0 mr-2"} self-end`}
              >
                {onReply ? (
                  <button
                    type="button"
                    className="rounded-full border border-border bg-background/80 px-2 py-0.5 text-xs hover:bg-secondary"
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
                  className="rounded-full border border-border bg-background/80 px-2 py-0.5 text-xs hover:bg-secondary"
                  onClick={() => {
                    console.log("[Messaging][Picker] toggle", {
                      messageId: Number(message.id),
                    });
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
                          (sum, reaction) => sum + Number(reaction.count ?? 0),
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
                    className={`absolute top-full mt-2 z-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg ${mine ? "right-0" : "left-0"}`}
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
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : null}
        </div>
      </ScrollArea>

      {newIncomingCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            scrollToBottom("smooth");
            isNearBottomRef.current = true;
            setNewIncomingCount(0);
          }}
          className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-700"
          aria-label="Scroll to newest message"
        >
          <ArrowDown className="h-4 w-4" />
          <span>New</span>
          <span className="rounded-full bg-black/20 px-2 py-0.5">{downArrowLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

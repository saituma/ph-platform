"use client";

import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { ScrollArea } from "../../ui/scroll-area";
import type { ChatMessage, ChatReaction } from "./types";

type EmojiPick = {
  native?: string;
};

type ThreadMessageListProps = {
  messages: ChatMessage[];
  onReact: (messageId: number, emoji: string) => void;
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
        : (Array.isArray(message.reactions) ? message.reactions : []).find((reaction) =>
            Array.isArray(reaction.userIds) ? reaction.userIds.includes(currentUserId) : false,
          ) ?? null;

    if (myReaction?.emoji && myReaction.emoji !== emoji.native) {
      console.log("[Messaging][Picker] remove-old", { messageId, oldEmoji: myReaction.emoji });
      await Promise.resolve(onReact(messageId, myReaction.emoji));
    }
    console.log("[Messaging][Picker] apply-new", { messageId, newEmoji: emoji.native });
    await Promise.resolve(onReact(messageId, emoji.native));
    setPickerMessageId(null);
  };

  return (
    <ScrollArea className="h-[420px] rounded-xl border border-border p-3">
      <div className="space-y-3">
        {messages.map((message) => {
          const senderId = Number(message?.senderId ?? NaN);
          const receiverId = Number(message?.receiverId ?? NaN);
          const normalizedRole = String(message?.senderRole ?? "").trim().toLowerCase();
          const normalizedSenderName = String(message?.senderName ?? "").trim().toLowerCase();
          const normalizedPeerName = String(directPeerName ?? "").trim().toLowerCase();
          const mineById = Number.isFinite(senderId) && currentUserId != null ? senderId === currentUserId : false;
          const mineByRole = normalizedRole === "admin" || normalizedRole === "coach" || normalizedRole === "superadmin";
          const mineByDirectPeerSender =
            mode === "direct" && directPeerUserId != null && Number.isFinite(senderId)
              ? senderId !== directPeerUserId
              : null;
          const mineByDirectPeerReceiver =
            mode === "direct" && directPeerUserId != null && Number.isFinite(receiverId)
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
          const reactions: ChatReaction[] = Array.isArray(message?.reactions) ? message.reactions : [];
          const hasImage = Boolean(message.mediaUrl && message.contentType === "image");
          const hasVideo = Boolean(message.mediaUrl && message.contentType === "video");
          const hasMedia = hasImage || hasVideo;
          const normalizedText = String(message.content ?? "").trim().toLowerCase();
          const hidePlaceholderText = normalizedText === "attachment";
          const showText = Boolean(message.content && !hidePlaceholderText);
          const mediaOnly = hasMedia && !showText;
          return (
            <div key={message.id} className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] space-y-2 rounded-xl px-3 py-2 ${
                  mediaOnly
                    ? "bg-transparent px-0 py-0 shadow-none"
                    : mine
                      ? "bg-emerald-600 text-white"
                      : "border border-border bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                {showSenderName ? <p className="text-xs opacity-80">{message.senderName ?? "Member"}</p> : null}
                {hasImage ? (
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
                {showText ? <p className="text-sm whitespace-pre-wrap">{message.content}</p> : null}
                <p className={`mt-1 text-[10px] ${mine && !mediaOnly ? "text-white/80" : "text-muted-foreground"}`}>
                  {formatTime(message.createdAt)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {reactions.map((reaction) => (
                    <span
                      key={`${message.id}-${reaction.emoji}`}
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        mine
                          ? "border-primary-foreground/40 bg-primary-foreground/10"
                          : "border-border bg-background/60"
                      }`}
                    >
                      {reaction.emoji} {Number(reaction.count ?? 0)}
                    </span>
                  ))}
                </div>
              </div>
              <div data-reaction-picker-root="true" className={`relative ${mine ? "mr-0 ml-2" : "ml-0 mr-2"} self-end`}>
                <button
                  type="button"
                  className="rounded-full border border-border bg-background/80 px-2 py-0.5 text-xs hover:bg-secondary"
                  onClick={() => {
                    console.log("[Messaging][Picker] toggle", { messageId: Number(message.id) });
                    setPickerMessageId((current) => (current === String(message.id) ? null : String(message.id)))
                  }}
                  aria-label="Add custom reaction"
                >
                  {reactions.length ? (
                    <span className="flex items-center gap-1">
                      <span>{reactions[0].emoji}</span>
                      <span>{reactions.reduce((sum, reaction) => sum + Number(reaction.count ?? 0), 0)}</span>
                    </span>
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </button>
                {pickerMessageId === String(message.id) ? (
                  <div className={`absolute top-full mt-2 z-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg ${mine ? "right-0" : "left-0"}`}>
                    {reactions.length ? (
                      <div className="max-w-72 border-b border-border px-3 py-2 text-xs">
                        <p className="mb-1 font-semibold text-foreground">Reactions</p>
                        <div className="space-y-1.5">
                          {reactions.map((reaction) => {
                            const users =
                              Array.isArray(reaction.userIds) && reaction.userIds.length
                                ? reaction.userIds.map((userId) =>
                                    resolveUserName ? resolveUserName(userId) : `User ${userId}`,
                                  )
                                : [];
                            return (
                              <div key={`detail-${message.id}-${reaction.emoji}`} className="rounded-md bg-secondary/50 px-2 py-1">
                                <p className="font-medium">
                                  {reaction.emoji} {reaction.count}
                                </p>
                                {users.length ? (
                                  <p className="truncate text-muted-foreground">{users.join(", ")}</p>
                                ) : (
                                  <p className="text-muted-foreground">No user details</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <Picker
                      data={emojiData}
                      onEmojiSelect={(emoji: EmojiPick) => void handlePickReaction(message, emoji)}
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
        {!messages.length ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null}
      </div>
    </ScrollArea>
  );
}

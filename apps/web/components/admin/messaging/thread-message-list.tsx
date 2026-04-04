"use client";

import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ScrollArea } from "../../ui/scroll-area";
import type { ChatMessage, ChatReaction } from "./types";

type EmojiPick = {
  native?: string;
};

type ThreadMessageListProps = {
  messages: ChatMessage[];
  reactionPresets: string[];
  onReact: (messageId: number, emoji: string) => void;
  formatTime: (value?: string | null) => string;
  currentUserId?: number | null;
  mode?: "direct" | "group";
  directPeerUserId?: number | null;
  directPeerName?: string | null;
  showSenderName?: boolean;
  emptyLabel: string;
};

export function ThreadMessageList({
  messages,
  reactionPresets,
  onReact,
  formatTime,
  currentUserId,
  mode = "direct",
  directPeerUserId = null,
  directPeerName = null,
  showSenderName = false,
  emptyLabel,
}: ThreadMessageListProps) {
  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(target)) {
        setPickerMessageId(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const handlePickReaction = (messageId: number, emoji: EmojiPick) => {
    if (!emoji.native) return;
    onReact(messageId, emoji.native);
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
          const messageId = Number(message.id);
          return (
            <div key={message.id} className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] space-y-2 rounded-xl px-3 py-2 ${
                  mine
                    ? "bg-emerald-600 text-white"
                    : "border border-border bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                {showSenderName ? <p className="text-xs opacity-80">{message.senderName ?? "Member"}</p> : null}
                {message.mediaUrl && message.contentType === "image" ? (
                  <img src={message.mediaUrl} alt="Message media" className="max-h-64 w-full rounded-lg object-cover" />
                ) : null}
                {message.mediaUrl && message.contentType === "video" ? (
                  <video src={message.mediaUrl} controls className="max-h-64 w-full rounded-lg" />
                ) : null}
                {message.content ? <p className="text-sm whitespace-pre-wrap">{message.content}</p> : null}
                <p className={`mt-1 text-[10px] ${mine ? "text-white/80" : "text-muted-foreground"}`}>
                  {formatTime(message.createdAt)}
                </p>
                <div ref={pickerContainerRef} className="relative flex flex-wrap items-center gap-1.5">
                  {reactionPresets.map((emoji) => (
                    <button
                      key={`${message.id}-${emoji}`}
                      type="button"
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        mine
                          ? "border-primary-foreground/40 bg-primary-foreground/10"
                          : "border-border bg-background/60"
                      }`}
                      onClick={() => onReact(messageId, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      mine
                        ? "border-primary-foreground/40 bg-primary-foreground/10"
                        : "border-border bg-background/60"
                    }`}
                    onClick={() =>
                      setPickerMessageId((current) => (current === String(message.id) ? null : String(message.id)))
                    }
                    aria-label="Add custom reaction"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
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
                  {pickerMessageId === String(message.id) ? (
                    <div className="absolute bottom-8 left-0 z-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                      <Picker
                        data={emojiData}
                        onEmojiSelect={(emoji: EmojiPick) => handlePickReaction(messageId, emoji)}
                        previewPosition="none"
                        skinTonePosition="none"
                        maxFrequentRows={1}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {!messages.length ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null}
      </div>
    </ScrollArea>
  );
}

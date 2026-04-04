"use client";

import { ScrollArea } from "../../ui/scroll-area";
import type { ChatMessage, ChatReaction } from "./types";

type ThreadMessageListProps = {
  messages: ChatMessage[];
  reactionPresets: string[];
  onReact: (messageId: number, emoji: string) => void;
  formatTime: (value?: string | null) => string;
  showSenderName?: boolean;
  emptyLabel: string;
};

export function ThreadMessageList({
  messages,
  reactionPresets,
  onReact,
  formatTime,
  showSenderName = false,
  emptyLabel,
}: ThreadMessageListProps) {
  return (
    <ScrollArea className="h-[420px] rounded-xl border border-border p-3">
      <div className="space-y-3">
        {messages.map((message) => {
          const mine = message?.senderRole === "admin" || message?.senderRole === "coach";
          const reactions: ChatReaction[] = Array.isArray(message?.reactions) ? message.reactions : [];
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] space-y-2 rounded-xl px-3 py-2 ${
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
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
                <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {formatTime(message.createdAt)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {reactionPresets.map((emoji) => (
                    <button
                      key={`${message.id}-${emoji}`}
                      type="button"
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        mine
                          ? "border-primary-foreground/40 bg-primary-foreground/10"
                          : "border-border bg-background/60"
                      }`}
                      onClick={() => onReact(Number(message.id), emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
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
            </div>
          );
        })}
        {!messages.length ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null}
      </div>
    </ScrollArea>
  );
}

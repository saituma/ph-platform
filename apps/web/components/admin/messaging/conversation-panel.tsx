import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { EmptyState } from "../empty-state";
import { Badge } from "../../ui/badge";
import { Image as ImageIcon, Paperclip, Smile, Send, Star } from "lucide-react";

type Message = {
  id: string;
  author: string;
  time: string;
  text: string;
  reactions?: { emoji: string; count: number; reactedByMe?: boolean }[];
  status?: "sent" | "delivered" | "read";
};

type ConversationPanelProps = {
  name?: string | null;
  messages: Message[];
  profile?: {
    tier: string;
    status: string;
    lastActive: string;
    tags: string[];
  } | null;
  onReact?: (messageId: string, emoji: string) => void;
  onSend?: (text: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  typingLabel?: string | null;
};

export function ConversationPanel({
  name,
  messages,
  profile,
  onReact,
  onSend,
  onTypingChange,
  typingLabel,
}: ConversationPanelProps) {
  const [draft, setDraft] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const typingRef = useRef<{ active: boolean; timer?: NodeJS.Timeout | null }>({
    active: false,
    timer: null,
  });
  const quickReplies = [
    "Great work. Keep this pace for the next session.",
    "Received. I will review and get back to you shortly.",
    "Can you share a short update after your next workout?",
    "Nice progress. Let us lock this in for the week.",
  ];

  const appendToDraft = (text: string) => {
    setDraft((prev) => (prev.trim() ? `${prev}\n${text}` : text));
  };

  const formatFileMessage = (file: File, label: "File" | "Image") => {
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    return `${label} attached: ${file.name} (${sizeKb} KB)`;
  };

  useEffect(() => {
    if (!onTypingChange) return;
    if (draft.trim().length > 0) {
      if (!typingRef.current.active) {
        typingRef.current.active = true;
        onTypingChange(true);
      }
      if (typingRef.current.timer) {
        clearTimeout(typingRef.current.timer);
      }
      typingRef.current.timer = setTimeout(() => {
        typingRef.current.active = false;
        onTypingChange(false);
      }, 1200);
    } else if (typingRef.current.active) {
      typingRef.current.active = false;
      onTypingChange(false);
    }
  }, [draft, onTypingChange]);

  if (!name) {
    return (
      <EmptyState
        title="Select a conversation"
        description="Choose a thread from the inbox to reply."
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-16rem)] min-h-[34rem] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/30 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">
            {profile ? `${profile.status} • Last active ${profile.lastActive}` : "Active"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile?.tier ? <Badge variant="primary">{profile.tier}</Badge> : null}
          {profile?.tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          <Button size="icon" variant="ghost">
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
        {messages.map((message) => {
          const isCoach = message.author === "Coach";
          return (
            <div
              key={message.id}
              className={`flex ${isCoach ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`group max-w-[80%] rounded-2xl border border-border p-4 text-sm ${
                  isCoach ? "bg-primary/10 text-foreground" : "bg-secondary/40"
                }`}
              >
                <p className="text-xs text-muted-foreground">
                  {message.author} • {message.time}
                </p>
                <p className="mt-2 text-foreground">{message.text}</p>
                {message.reactions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.reactions.map((reaction) => (
                      <button
                        type="button"
                        key={reaction.emoji}
                        className={`rounded-full border px-2 py-1 text-xs ${
                          reaction.reactedByMe
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background"
                        }`}
                        onClick={() => onReact?.(message.id, reaction.emoji)}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 opacity-0 transition group-hover:opacity-100">
                  {["👍", "🔥", "💪", "👏"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary/60"
                      onClick={() => onReact?.(message.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {isCoach && message.status ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {message.status === "read"
                      ? "Read"
                      : message.status === "delivered"
                      ? "Delivered"
                      : "Sent"}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      {typingLabel ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary/60" />
          {typingLabel}
        </div>
      ) : null}
      <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            appendToDraft(formatFileMessage(file, "File"));
            event.target.value = "";
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            appendToDraft(formatFileMessage(file, "Image"));
            event.target.value = "";
          }}
        />
        <Textarea
          placeholder="Write a response..."
          className="min-h-[120px]"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => imageInputRef.current?.click()}
              title="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Smile className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQuickReplies((prev) => !prev)}
              >
              Quick Reply
              </Button>
              {showQuickReplies ? (
                <div className="absolute bottom-12 left-0 z-20 w-72 rounded-xl border border-border bg-background p-2 shadow-lg">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-secondary/50"
                      onClick={() => {
                        appendToDraft(reply);
                        setShowQuickReplies(false);
                      }}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">Save Draft</Button>
            <Button
              className="gap-2"
              onClick={() => {
                if (!draft.trim()) return;
                onSend?.(draft.trim());
                setDraft("");
              }}
            >
              Send
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

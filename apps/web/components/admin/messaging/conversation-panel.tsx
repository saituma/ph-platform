import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { EmptyState } from "../empty-state";
import { Badge } from "../../ui/badge";
import { Image as ImageIcon, Paperclip, Smile, Send, Star } from "lucide-react";

type Message = {
  author: string;
  time: string;
  text: string;
  reactions?: { emoji: string; count: number }[];
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
  onReact?: (messageIndex: number, emoji: string) => void;
};

export function ConversationPanel({
  name,
  messages,
  profile,
  onReact,
}: ConversationPanelProps) {
  if (!name) {
    return (
      <EmptyState
        title="Select a conversation"
        description="Choose a thread from the inbox to reply."
      />
    );
  }

  return (
    <div className="space-y-6">
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
      <div className="space-y-3">
        {messages.map((message, index) => {
          const isCoach = message.author === "Coach";
          return (
            <div
              key={`${message.author}-${message.time}-${index}`}
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
                        className="rounded-full border border-border bg-background px-2 py-1 text-xs"
                        onClick={() => onReact?.(index, reaction.emoji)}
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
                      onClick={() => onReact?.(index, emoji)}
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary/60" />
        Ava is typing...
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
        <Textarea placeholder="Write a response..." className="min-h-[120px]" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Smile className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              Quick Reply
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">Save Draft</Button>
            <Button className="gap-2">
              Send
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

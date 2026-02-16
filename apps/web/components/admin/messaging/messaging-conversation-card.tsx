import { Card, CardContent, CardHeader } from "../../ui/card";
import { SectionHeader } from "../section-header";
import { ComposerAttachment, ConversationPanel } from "./conversation-panel";

type MessageItem = {
  id: string;
  author: string;
  time: string;
  text: string;
  mediaUrl?: string | null;
  contentType?: "text" | "image" | "video";
  reactions?: { emoji: string; count: number; reactedByMe?: boolean }[];
  status?: "sent" | "delivered" | "read";
};

type MessagingConversationCardProps = {
  inboxMode: "direct" | "group";
  groups: { id: number; name: string }[];
  selectedGroupId: number | null;
  selectedUserId: number | null;
  selectedThreadName: string | null;
  selectedThreadExists: boolean;
  selectedThreadPremium?: boolean;
  typingMap: Record<string, { name: string; isTyping: boolean }>;
  messages: MessageItem[];
  groupMessages: MessageItem[];
  onTypingChange: (isTyping: boolean) => void;
  onSend: (payload: { text: string; attachment?: ComposerAttachment | null }) => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
};

export function MessagingConversationCard({
  inboxMode,
  groups,
  selectedGroupId,
  selectedUserId,
  selectedThreadName,
  selectedThreadExists,
  selectedThreadPremium,
  typingMap,
  messages,
  groupMessages,
  onTypingChange,
  onSend,
  onReact,
}: MessagingConversationCardProps) {
  const selectedGroupName = groups.find((group) => group.id === selectedGroupId)?.name;
  const responseBadge =
    inboxMode === "direct" && selectedThreadExists
      ? selectedThreadPremium
        ? "Priority response"
        : "Standard response"
      : null;

  return (
    <Card className="h-full">
      <CardHeader>
        <SectionHeader
          title={
            inboxMode === "group" ? selectedGroupName ?? "Group Conversation" : selectedThreadName ?? "Conversation"
          }
          description={
            inboxMode === "group"
              ? selectedGroupId
                ? "Group chat"
                : "Select a group"
              : selectedThreadExists
              ? "Active"
              : "Select a thread"
          }
        />
        {responseBadge ? (
          <div className="mt-2 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {responseBadge}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <ConversationPanel
          name={inboxMode === "group" ? selectedGroupName ?? null : selectedThreadName}
          messages={inboxMode === "group" ? groupMessages : messages}
          profile={null}
          typingLabel={
            inboxMode === "group"
              ? typingMap[`group:${selectedGroupId}`]?.isTyping
                ? `${typingMap[`group:${selectedGroupId}`]?.name} is typing...`
                : null
              : typingMap[`user:${selectedUserId}`]?.isTyping
              ? `${typingMap[`user:${selectedUserId}`]?.name} is typing...`
              : null
          }
          onTypingChange={onTypingChange}
          onSend={onSend}
          onReact={onReact}
        />
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader } from "../../ui/card";
import { SectionHeader } from "../section-header";
import { ConversationPanel } from "./conversation-panel";

type MessageItem = {
  id: string;
  author: string;
  time: string;
  text: string;
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
  typingMap: Record<string, { name: string; isTyping: boolean }>;
  messages: MessageItem[];
  groupMessages: MessageItem[];
  onTypingChange: (isTyping: boolean) => void;
  onSend: (text: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
};

export function MessagingConversationCard({
  inboxMode,
  groups,
  selectedGroupId,
  selectedUserId,
  selectedThreadName,
  selectedThreadExists,
  typingMap,
  messages,
  groupMessages,
  onTypingChange,
  onSend,
  onReact,
}: MessagingConversationCardProps) {
  const selectedGroupName = groups.find((group) => group.id === selectedGroupId)?.name;

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

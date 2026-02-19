import { ChatMessage } from "@/constants/messages";

export type MessageThread = {
  id: string;
  name: string;
  role: string;
  preview: string;
  time: string;
  pinned: boolean;
  premium: boolean;
  unread: number;
  avatarUrl?: string | null;
  lastSeen?: string;
  responseTime?: string;
};

export type TypingStatus = Record<string, { name: string; isTyping: boolean }>;

export type ThreadMessageProps = {
  message: ChatMessage;
  threadName: string;
  isGroup: boolean;
  onLongPress: (message: ChatMessage) => void;
  onReactionPress: (message: ChatMessage, emoji: string) => void;
};

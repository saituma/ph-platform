import { ApiChatMessage, ApiChatReaction } from "./chat-api";

export type SocketMessageNewPayload = ApiChatMessage & {
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string | null;
  receiverName?: string;
  clientId?: string;
};

export type SocketGroupMessagePayload = ApiChatMessage & {
  groupId: number;
  groupName?: string;
  clientId?: string;
};

export type SocketTypingUpdatePayload = {
  name: string;
  isTyping: boolean;
  scope: "group" | "direct";
  groupId?: number;
  fromUserId?: number;
};

export type SocketMessageReactionPayload = {
  messageId: number;
  reactions: ApiChatReaction[];
};

export type SocketMessageDeletedPayload = {
  messageId: number;
};

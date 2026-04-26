export type ApiChatReaction = {
  emoji: string;
  count: number;
  userIds: number[];
};

export type ApiChatMessage = {
  id: number;
  senderId: number;
  receiverId?: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string;
  videoUploadId?: number;
  read: boolean;
  createdAt: string;
  reactions?: ApiChatReaction[];
  // Present for group chat endpoints (`/chat/groups/:id/messages`).
  senderName?: string | null;
  senderProfilePicture?: string | null;
};

export type ApiCoach = {
  id: number;
  name: string;
  role?: string;
  profilePicture?: string | null;
  isAi?: boolean;
};

export type ApiChatGroup = {
  id: number;
  name: string;
  category?: string;
  createdAt: string;
  unreadCount?: number;
  lastMessage?: {
    content: string;
    contentType?: string;
    createdAt: string;
    senderName?: string | null;
    senderProfilePicture?: string | null;
  } | null;
};

export type ApiGroupMember = {
  userId: number;
  name: string;
  displayName?: string;
  email: string;
  profilePicture?: string | null;
};

export type ChatMessagesResponse = {
  messages: ApiChatMessage[];
  coach?: ApiCoach;
  coaches?: ApiCoach[];
};

export type ChatGroupsResponse = {
  groups: ApiChatGroup[];
};

export type GroupMessagesResponse = {
  messages: ApiChatMessage[];
};

export type GroupMembersResponse = {
  members: ApiGroupMember[];
};

export type ApiInboxThread = {
  id: string;
  type: "direct" | "group";
  peerUserId?: number;
  groupId?: number;
  groupCategory?: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  preview: string;
  unread: number;
  updatedAt: string;
  lastSeenAt?: string | null;
  lastMessageId?: number | null;
  lastMessageSenderId?: number | null;
  lastMessageSenderName?: string | null;
  lastMessageSenderProfilePicture?: string | null;
  lastMessageContent?: string | null;
  lastMessageContentType?: string | null;
  lastMessageCreatedAt?: string | null;
};

export type InboxResponse = {
  threads: ApiInboxThread[];
};

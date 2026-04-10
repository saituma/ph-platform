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
  } | null;
};

export type ApiGroupMember = {
  userId: number;
  name: string;
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

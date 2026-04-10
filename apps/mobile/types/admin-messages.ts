export type AdminDmThread = {
  userId: number;
  name?: string | null;
  preview?: string | null;
  time?: string | Date | null;
  unread?: number | null;
  programTier?: string | null;
  premium?: boolean | null;
};

export type DirectMessage = {
  id?: number;
  clientId?: string | null;
  senderId?: number;
  receiverId?: number;
  content?: string | null;
  contentType?: "text" | "image" | "video" | string | null;
  mediaUrl?: string | null;
  videoUploadId?: number | null;
  createdAt?: string | Date | null;
  read?: boolean | null;
};

export type ChatGroup = {
  id: number;
  name?: string | null;
  category?: string | null;
  unreadCount?: number | null;
  lastMessage?: {
    content?: string | null;
    createdAt?: string | Date | null;
  } | null;
};

export type GroupMessage = {
  id?: number;
  clientId?: string | null;
  groupId?: number;
  senderId?: number;
  content?: string | null;
  contentType?: "text" | "image" | "video" | string | null;
  mediaUrl?: string | null;
  createdAt?: string | Date | null;
  reactions?: any[];
};

export type PendingAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isImage: boolean;
};

export type AdminUserResult = {
  id?: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export type GroupMember = {
  userId: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  profilePicture?: string | null;
};

export type HeaderTabKey = "announcement" | "inbox" | "teams" | "stats";

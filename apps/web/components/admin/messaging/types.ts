"use client";

export type MessagingUser = {
  id: number;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  programTier?: string | null;
  currentProgramTier?: string | null;
  desiredProgramType?: string | null;
};

export type ThreadApiItem = {
  userId: number | string;
  preview?: string | null;
  unread?: number | string | null;
  time?: string | null;
};

export type AnnouncementItem = {
  id: number | string;
  title?: string | null;
  body?: string | null;
  createdAt?: string | null;
};

export type ChatGroupItem = {
  id: number;
  name?: string | null;
  category?: "announcement" | "coach_group" | "team" | null;
  createdAt?: string | null;
};

export type ChatReaction = {
  emoji: string;
  count: number;
  userIds?: number[];
};

export type ChatMessage = {
  id: number | string;
  senderId?: number | string | null;
  receiverId?: number | string | null;
  senderRole?: string | null;
  senderName?: string | null;
  content?: string | null;
  contentType?: "text" | "image" | "video" | string | null;
  mediaUrl?: string | null;
  createdAt?: string | null;
  reactions?: ChatReaction[] | null;
};

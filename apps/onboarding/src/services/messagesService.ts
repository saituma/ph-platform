import { env } from "@/env";

export type ApiChatMessage = {
  id: number;
  senderId: number;
  receiverId?: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string;
  read: boolean;
  createdAt: string;
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

export type MessageThread = {
  id: string;
  name: string;
  role: string;
  preview: string;
  time: string;
  unread: number;
  avatarUrl?: string | null;
  type: "direct" | "group";
};

export async function fetchInbox(token: string): Promise<{ threads: MessageThread[] }> {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  
  try {
    const [messagesRes, groupsRes] = await Promise.all([
      fetch(`${baseUrl}/api/messages`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${baseUrl}/api/chat/groups`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const messagesData = messagesRes.ok ? await messagesRes.json() : { messages: [], coach: null };
    const groupsData = groupsRes.ok ? await groupsRes.json() : { groups: [] };

    const threads: MessageThread[] = [];

    // Map Coach (Direct Message)
    if (messagesData.coach) {
      const coach = messagesData.coach;
      const lastMsg = messagesData.messages[0];
      threads.push({
        id: `coach:${coach.id}`,
        name: coach.name,
        role: coach.role || "Performance Coach",
        avatarUrl: coach.profilePicture,
        preview: lastMsg?.content || "Start a conversation",
        time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        unread: messagesData.messages.filter((m: any) => !m.read && m.senderId === coach.id).length,
        type: "direct"
      });
    }

    // Map Groups
    const groups = groupsData.groups || [];
    groups.forEach((group: ApiChatGroup) => {
      threads.push({
        id: `group:${group.id}`,
        name: group.name,
        role: group.category || "Team Group",
        preview: group.lastMessage?.content || "No messages yet",
        time: group.lastMessage ? new Date(group.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        unread: group.unreadCount || 0,
        type: "group"
      });
    });

    return { threads };
  } catch (err) {
    console.error("Fetch inbox error:", err);
    return { threads: [] };
  }
}

export async function fetchThreadMessages(token: string, threadId: string): Promise<ApiChatMessage[]> {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  const [type, id] = threadId.split(":");

  const endpoint = type === "group" 
    ? `${baseUrl}/api/chat/groups/${id}/messages`
    : `${baseUrl}/api/messages`;

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) throw new Error("Failed to fetch messages");
  const data = await response.json();
  return data.messages || [];
}

export async function sendMessage(token: string, threadId: string, content: string): Promise<any> {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  const [type, id] = threadId.split(":");

  const endpoint = type === "group" 
    ? `${baseUrl}/api/chat/groups/${id}/messages`
    : `${baseUrl}/api/messages`;

  const body: any = { content };
  if (type === "coach") body.receiverId = Number(id);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error("Failed to send message");
  return response.json();
}

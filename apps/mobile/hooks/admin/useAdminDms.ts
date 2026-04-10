import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AdminDmThread, DirectMessage, PendingAttachment } from "@/types/admin-messages";
import { safeNumber } from "@/lib/admin-messages-utils";

export function useAdminDms(token: string | null, canLoad: boolean) {
  const [threads, setThreads] = useState<AdminDmThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);

  const [activeDmUserId, setActiveDmUserId] = useState<number | null>(null);
  const [activeDmName, setActiveDmName] = useState<string>("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const loadThreads = useCallback(
    async (query: string, forceRefresh: boolean) => {
      if (!token || !canLoad) return;
      setThreadsLoading(true);
      setThreadsError(null);
      try {
        const q = query.trim();
        const searchParams = new URLSearchParams();
        if (q) searchParams.set("q", q);
        searchParams.set("limit", "80");

        const res = await apiRequest<{ threads?: AdminDmThread[] }>(
          `/admin/messages/threads?${searchParams.toString()}`,
          {
            token,
            skipCache: forceRefresh,
            forceRefresh,
            suppressStatusCodes: [403],
          },
        );
        setThreads(Array.isArray(res?.threads) ? res.threads : []);
      } catch (e) {
        setThreadsError(e instanceof Error ? e.message : "Failed to load inbox");
        setThreads([]);
      } finally {
        setThreadsLoading(false);
      }
    },
    [canLoad, token],
  );

  const loadMessages = useCallback(async (userId: number, forceRefresh: boolean) => {
    if (!token || !canLoad) return;
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const res = await apiRequest<{ messages?: DirectMessage[] }>(
        `/admin/messages/threads/${userId}?limit=50`,
        {
          token,
          skipCache: forceRefresh,
          forceRefresh,
          suppressStatusCodes: [403],
        }
      );
      setMessages(Array.isArray(res?.messages) ? res.messages.reverse() : []);
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : "Failed to load thread");
    } finally {
      setMessagesLoading(false);
    }
  }, [canLoad, token]);

  const sendDm = useCallback(async (params: {
    receiverId: number;
    content: string;
    mediaUrl?: string;
    contentType?: string;
    videoUploadId?: number;
  }) => {
    if (!token || !canLoad) return;
    const { receiverId, ...body } = params;
    const res = await apiRequest<{ message?: DirectMessage }>(
      `/admin/messages/${receiverId}`,
      {
      method: "POST",
      token,
      body,
      skipCache: true,
      },
    );
    return res?.message;
  }, [canLoad, token]);

  return {
    threads,
    threadsLoading,
    threadsError,
    activeDmUserId,
    activeDmName,
    messages,
    messagesLoading,
    messagesError,
    setActiveDmUserId,
    setActiveDmName,
    setMessages,
    loadThreads,
    loadMessages,
    sendDm,
  };
}

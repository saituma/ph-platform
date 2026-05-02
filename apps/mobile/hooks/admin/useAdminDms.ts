import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AdminDmThread, DirectMessage } from "@/types/admin-messages";
import {
  getCachedAdminDmMessages,
  setCachedAdminDmMessages,
} from "@/lib/admin/adminMessageCache";
import { useAdminMutation } from "./useAdminQuery";
import { parseApiError } from "@/lib/errors";

export function useAdminDms(token: string | null, canLoad: boolean) {
  const enabled = Boolean(token && canLoad);

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
      if (!enabled) return;
      setThreadsLoading(true);
      setThreadsError(null);
      try {
        const q = query.trim();
        const searchParams = new URLSearchParams();
        if (q) searchParams.set("q", q);
        searchParams.set("limit", "80");
        const res = await apiRequest<{ threads?: AdminDmThread[] }>(
          `/admin/messages/threads?${searchParams.toString()}`,
          { token: token!, skipCache: forceRefresh, forceRefresh, suppressStatusCodes: [403] },
        );
        setThreads(Array.isArray(res?.threads) ? res.threads : []);
      } catch (e) {
        setThreadsError(parseApiError(e).message);
        setThreads([]);
      } finally {
        setThreadsLoading(false);
      }
    },
    [enabled, token],
  );

  const loadMessages = useCallback(
    async (userId: number, forceRefresh: boolean) => {
      if (!enabled) return;
      const cached = getCachedAdminDmMessages(userId);
      if (cached) setMessages(cached);
      setMessagesLoading(!cached);
      setMessagesError(null);
      try {
        const res = await apiRequest<{ messages?: DirectMessage[] }>(
          `/admin/messages/${userId}?limit=50`,
          { token: token!, skipCache: forceRefresh, forceRefresh, suppressStatusCodes: [403] },
        );
        const nextMessages = Array.isArray(res?.messages) ? [...res.messages].reverse() : [];
        setCachedAdminDmMessages(userId, nextMessages);
        setMessages(nextMessages);
        void apiRequest(`/admin/messages/${userId}/read`, {
          method: "POST",
          token: token!,
          suppressStatusCodes: [401, 403, 404],
          suppressLog: true,
        }).catch(() => {});
      } catch (e) {
        setMessagesError(parseApiError(e).message);
      } finally {
        setMessagesLoading(false);
      }
    },
    [enabled, token],
  );

  const sendMutation = useAdminMutation<
    {
      receiverId: number;
      content: string;
      mediaUrl?: string;
      contentType?: string;
      videoUploadId?: number;
      replyToMessageId?: number;
      replyPreview?: string;
    },
    DirectMessage | undefined
  >(
    useCallback(
      async (params) => {
        if (!enabled) return;
        const { receiverId, ...body } = params;
        const res = await apiRequest<{ message?: DirectMessage }>(
          `/admin/messages/${receiverId}`,
          { method: "POST", token: token!, body, skipCache: true },
        );
        return res?.message;
      },
      [enabled, token],
    ),
  );

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
    sendDm: (params: {
      receiverId: number;
      content: string;
      mediaUrl?: string;
      contentType?: string;
      videoUploadId?: number;
      replyToMessageId?: number;
      replyPreview?: string;
    }) => sendMutation.run(params),
  };
}

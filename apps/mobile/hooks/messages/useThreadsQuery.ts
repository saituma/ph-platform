/**
 * TanStack Query-backed thread list loader.
 *
 * Replaces the hand-rolled fetch + in-memory cache in useChatActions.loadMessages
 * for the threads/inbox portion. The existing optimistic message layer (useState in
 * useChatState) remains untouched — this hook only owns the server-truth side.
 *
 * Benefits:
 * - Socket reconnect → invalidate(['messages','threads']) — one line
 * - Acting user switch → invalidate(['messages','threads']) — one line
 * - Pull-to-refresh → refetch() — one line
 * - No inFlightLoadRef / pendingReloadRef concurrency guards needed
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import * as chatService from "@/services/messages/chatService";
import { messagesApi } from "@/lib/apiClient/messages";
import type { ChatMessagesResponse, InboxResponse } from "@/types/chat-api";

type ThreadsQueryOptions = {
  token: string | null;
  actingHeaders: Record<string, string> | undefined;
  effectiveProfileId: number;
  enabled: boolean;
};

export function useThreadsQuery({
  token,
  actingHeaders,
  effectiveProfileId,
  enabled,
}: ThreadsQueryOptions) {
  const queryClient = useQueryClient();

  const threadsQuery = useQuery({
    queryKey: queryKeys.messages.threads(effectiveProfileId),
    queryFn: async () => {
      const [inboxData, data] = await Promise.all([
        chatService.fetchInbox(token!, actingHeaders) as Promise<InboxResponse>,
        messagesApi.listThreads({
          token,
          headers: actingHeaders,
          suppressStatusCodes: [401, 403],
        }) as Promise<ChatMessagesResponse>,
      ]);
      return { inbox: inboxData, messages: data };
    },
    enabled: Boolean(token) && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.messages.threads(effectiveProfileId),
    });

  const refetch = () => threadsQuery.refetch();

  return {
    data: threadsQuery.data,
    isLoading: threadsQuery.isLoading,
    isFetching: threadsQuery.isFetching,
    invalidate,
    refetch,
  };
}

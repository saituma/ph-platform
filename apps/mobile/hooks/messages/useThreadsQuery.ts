/**
 * TanStack Query-backed thread list loader.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { queryKeys } from "@/lib/queryKeys";
import * as chatService from "@/services/messages/chatService";
import { messagesApi } from "@/lib/apiClient/messages";
import type {
  ChatGroupsResponse,
  ChatMessagesResponse,
  InboxResponse,
} from "@/types/chat-api";

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
      const actingUserHeaders = actingHeaders ?? {};
      const [inboxResult, threadsResult, groupsResult] = await Promise.allSettled([
        chatService.fetchInbox(token!, actingUserHeaders) as Promise<InboxResponse>,
        messagesApi.listThreads({
          token,
          headers: actingUserHeaders,
          suppressStatusCodes: [401, 403],
        }) as Promise<ChatMessagesResponse>,
        messagesApi.groups.list({
          token,
          headers: actingUserHeaders,
          suppressStatusCodes: [401, 403],
        }) as Promise<ChatGroupsResponse>,
      ]);

      const inboxData: InboxResponse =
        inboxResult.status === "fulfilled" && inboxResult.value
          ? inboxResult.value
          : ({ threads: [] } as InboxResponse);
      const data: ChatMessagesResponse =
        threadsResult.status === "fulfilled" && threadsResult.value
          ? threadsResult.value
          : ({ messages: [], coaches: [] } as ChatMessagesResponse);
      const groups: ChatGroupsResponse =
        groupsResult.status === "fulfilled" && groupsResult.value
          ? groupsResult.value
          : ({ groups: [] } as ChatGroupsResponse);

      return {
        inbox: inboxData,
        messages: data,
        groups,
      };
    },
    enabled: Boolean(token) && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.threads(effectiveProfileId),
      }),
    [queryClient, effectiveProfileId],
  );

  const refetch = useCallback(() => threadsQuery.refetch(), [threadsQuery.refetch]);

  return {
    data: threadsQuery.data,
    isLoading: threadsQuery.isLoading,
    isFetching: threadsQuery.isFetching,
    invalidate,
    refetch,
  };
}

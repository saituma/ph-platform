import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { messagesApi } from "@/lib/apiClient/messages";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Returns mute status + toggle helpers for a single conversation thread.
 * threadId format: peer userId string for DMs, "group:<id>" for group chats.
 */
export function useThreadMute(threadId: string) {
  const token = useAppSelector((s) => s.user.token);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.messages.muteStatus(threadId),
    queryFn: async () => {
      const res = await messagesApi.mutes.getStatus(threadId, { token });
      return res?.muted ?? false;
    },
    enabled: Boolean(token && threadId),
    staleTime: 30_000,
  });

  const mute = useMutation({
    mutationFn: (mutedUntil: string | null) =>
      messagesApi.mutes.mute(threadId, mutedUntil, { token }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.muteStatus(threadId) });
      queryClient.setQueryData(queryKeys.messages.muteStatus(threadId), true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.muteStatus(threadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.mutes() });
    },
  });

  const unmute = useMutation({
    mutationFn: () => messagesApi.mutes.unmute(threadId, { token }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.muteStatus(threadId) });
      queryClient.setQueryData(queryKeys.messages.muteStatus(threadId), false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.muteStatus(threadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.mutes() });
    },
  });

  return {
    isMuted: query.data ?? false,
    isLoading: query.isLoading,
    muteIndefinitely: () => mute.mutate(null),
    muteFor: (hours: number) => {
      const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      mute.mutate(until);
    },
    unmute: () => unmute.mutate(),
    isMuting: mute.isPending,
    isUnmuting: unmute.isPending,
  };
}

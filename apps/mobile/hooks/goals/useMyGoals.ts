import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useSocket } from "@/context/SocketContext";
import { useToast } from "@/components/ui/toast";

function toArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export type TrackingGoal = {
  id: number;
  title: string;
  description: string | null;
  unit: "km" | "sec" | "min" | "reps" | "custom";
  customUnit: string | null;
  targetValue: number;
  scope: "all" | "individual" | "team";
  audience: "adult" | "premium_team" | "all" | "youth";
  dueDate: string | null;
  status: "active" | "archived";
  createdAt: string;
  coachName: string;
  progressValue: number;
  percentage: number;
  completed: boolean;
  completedAt: string | null;
};

export function useMyGoals(token: string | null) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { success } = useToast();

  const { data: goalsData, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.goals.myGoals(),
    queryFn: async () => {
      const res = await apiRequest<{ goals?: TrackingGoal[] }>("/tracking/goals", {
        token: token!,
        skipCache: true,
        forceRefresh: true,
      });
      return toArray(res.goals);
    },
    enabled: Boolean(token),
    staleTime: 2 * 60 * 1000,
  });

  const goals = toArray(goalsData);

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : "Failed to load goals.")
    : null;

  const refreshGoals = useCallback(async () => {
    if (!token) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.goals.myGoals() });
  }, [token, queryClient]);

  useEffect(() => {
    if (!socket || !token) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.myGoals() });
    const onCompleted = (payload: { title?: string }) => {
      refresh();
      success("Goal complete! 🎉", payload?.title);
    };
    socket.on("tracking:goals:changed", refresh);
    socket.on("tracking:goal:completed", onCompleted);
    return () => {
      socket.off("tracking:goals:changed", refresh);
      socket.off("tracking:goal:completed", onCompleted);
    };
  }, [socket, token, queryClient, success]);

  return { goals, isLoading, error, refreshGoals };
}

export function useLogGoalProgress(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { goalId: number; value: number; note?: string }) =>
      apiRequest<{ justCompleted: boolean; percentage: number; totalValue: number }>(
        `/tracking/goals/${input.goalId}/log`,
        { token: token!, method: "POST", body: { value: input.value, note: input.note } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.myGoals() });
    },
  });
}

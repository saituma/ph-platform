import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/context/SocketContext";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Listens to socket events and invalidates the matching TanStack Query caches
 * so screens pick up server-side changes immediately.
 */
export function useSocketQueryRefresh() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const pendingInvalidationsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!socket) return;

    const invalidateSoon = (key: readonly unknown[]) => {
      const id = JSON.stringify(key);
      if (pendingInvalidationsRef.current.has(id)) return;
      const timer = setTimeout(() => {
        pendingInvalidationsRef.current.delete(id);
        queryClient.invalidateQueries({ queryKey: key });
      }, 250);
      pendingInvalidationsRef.current.set(id, timer);
    };

    const invalidatePrograms = () => {
      invalidateSoon(["programs"]);
      invalidateSoon(queryKeys.training.all());
      invalidateSoon(queryKeys.admin.programs());
      invalidateSoon(queryKeys.preseason.all());
    };

    const invalidateSchedule = () => {
      invalidateSoon(queryKeys.schedule.all());
      invalidateSoon(["bookings"]);
      invalidateSoon(["programs", "scheduled"]);
    };

    const invalidateTracking = () => {
      invalidateSoon(["tracking"]);
    };

    const invalidateStories = () => {
      invalidateSoon(queryKeys.stories.all());
    };

    socket.on("story:changed", invalidateStories);
    socket.on("program:changed", invalidatePrograms);
    socket.on("program:assigned", invalidatePrograms);
    socket.on("program:session:submitted", invalidatePrograms);
    socket.on("program:session:coach-response", invalidatePrograms);
    socket.on("video:reviewed", invalidatePrograms);

    socket.on("schedule:changed", invalidateSchedule);
    socket.on("schedule:attendance:changed", invalidateSchedule);

    socket.on("tracking:goals:changed", invalidateTracking);

    return () => {
      socket.off("story:changed", invalidateStories);
      socket.off("program:changed", invalidatePrograms);
      socket.off("program:assigned", invalidatePrograms);
      socket.off("program:session:submitted", invalidatePrograms);
      socket.off("program:session:coach-response", invalidatePrograms);
      socket.off("video:reviewed", invalidatePrograms);
      socket.off("schedule:changed", invalidateSchedule);
      socket.off("schedule:attendance:changed", invalidateSchedule);
      socket.off("tracking:goals:changed", invalidateTracking);
      for (const timer of pendingInvalidationsRef.current.values()) {
        clearTimeout(timer);
      }
      pendingInvalidationsRef.current.clear();
    };
  }, [socket, queryClient]);
}

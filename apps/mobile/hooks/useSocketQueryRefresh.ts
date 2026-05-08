import { useEffect } from "react";
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

  useEffect(() => {
    if (!socket) return;

    const invalidatePrograms = () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.training.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.programs() });
    };

    const invalidateSchedule = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all() });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["programs", "scheduled"] });
    };

    socket.on("program:changed", invalidatePrograms);
    socket.on("program:assigned", invalidatePrograms);
    socket.on("program:session:submitted", invalidatePrograms);
    socket.on("program:session:coach-response", invalidatePrograms);
    socket.on("video:reviewed", invalidatePrograms);

    socket.on("schedule:changed", invalidateSchedule);

    return () => {
      socket.off("program:changed", invalidatePrograms);
      socket.off("program:assigned", invalidatePrograms);
      socket.off("program:session:submitted", invalidatePrograms);
      socket.off("program:session:coach-response", invalidatePrograms);
      socket.off("video:reviewed", invalidatePrograms);
      socket.off("schedule:changed", invalidateSchedule);
    };
  }, [socket, queryClient]);
}

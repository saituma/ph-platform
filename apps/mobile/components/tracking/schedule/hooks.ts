import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { ScheduleEvent, ServiceType } from "./types";
import { mapBookingsToEvents } from "./utils";

export function useScheduleData(token: string | null, isFocused: boolean) {
  const eventsQuery = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const data = await apiRequest<{ items: any[] }>("/bookings", { token, forceRefresh: true });
      return mapBookingsToEvents(data.items ?? []);
    },
    enabled: !!token && isFocused,
  });

  const servicesQuery = useQuery({
    queryKey: ["booking-services"],
    queryFn: async () => {
      const data = await apiRequest<{ items: ServiceType[] }>("/bookings/services", {
        token,
        forceRefresh: true,
        timeoutMs: 6000,
      });
      return data.items ?? [];
    },
    enabled: !!token,
  });

  return {
    events: eventsQuery.data ?? [],
    eventsLoading: eventsQuery.isLoading,
    eventsError: (eventsQuery.error as any)?.message ?? null,
    services: servicesQuery.data ?? [],
    servicesLoading: servicesQuery.isLoading,
    servicesError: (servicesQuery.error as any)?.message ?? null,
    refreshEvents: () => eventsQuery.refetch(),
    refreshServices: () => servicesQuery.refetch(),
  };
}

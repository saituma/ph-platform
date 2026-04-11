import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { GeneratedAvailabilityOccurrence, ScheduleEvent, ServiceType } from "./types";
import { endOfLocalDay, mapBookingsToEvents, startOfLocalDay } from "./utils";

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
      const data = await apiRequest<{ items: ServiceType[] }>(
        "/bookings/services?includeLocked=true",
        {
        token,
        forceRefresh: true,
        timeoutMs: 6000,
        },
      );
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

export function useGeneratedAvailability(input: {
  token: string | null;
  from: Date;
  to: Date;
  enabled: boolean;
}) {
  const fromIso = startOfLocalDay(input.from).toISOString();
  const toIso = endOfLocalDay(input.to).toISOString();

  const query = useQuery({
    queryKey: ["generated-availability", fromIso, toIso],
    queryFn: async () => {
      const data = await apiRequest<{ items: GeneratedAvailabilityOccurrence[] }>(
        `/bookings/generated-availability?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        {
          token: input.token,
          forceRefresh: true,
          timeoutMs: 8000,
        },
      );
      return data.items ?? [];
    },
    enabled: Boolean(input.token) && input.enabled,
  });

  return {
    availability: query.data ?? [],
    availabilityLoading: query.isLoading,
    availabilityError: (query.error as any)?.message ?? null,
    refreshAvailability: () => query.refetch(),
  };
}

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { GeneratedAvailabilityOccurrence, ServiceType } from "./types";
import { endOfLocalDay, mapBookingsToEvents, startOfLocalDay } from "./utils";

export function useScheduleData(token: string | null, profileId: number, isFocused: boolean) {
  const eventsQuery = useQuery({
    queryKey: queryKeys.bookings.all(profileId),
    queryFn: async () => {
      const data = await apiRequest<{ items: any[] }>("/bookings", { token });
      return mapBookingsToEvents(data.items ?? []);
    },
    enabled: !!token && isFocused,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const servicesQuery = useQuery({
    queryKey: queryKeys.bookings.services(profileId),
    queryFn: async () => {
      const data = await apiRequest<{ items: ServiceType[] }>(
        "/bookings/services?includeLocked=true&omitWithoutBookableSlots=true",
        {
          token,
          timeoutMs: 6000,
        },
      );
      return data.items ?? [];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
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
  profileId: number;
  from: Date;
  to: Date;
  enabled: boolean;
}) {
  const fromIso = startOfLocalDay(input.from).toISOString();
  const toIso = endOfLocalDay(input.to).toISOString();

  const query = useQuery({
    queryKey: queryKeys.bookings.generatedAvailability(input.profileId, fromIso, toIso),
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

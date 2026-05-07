import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { GeneratedAvailabilityOccurrence, ScheduleEvent, ServiceType } from "./types";
import { endOfLocalDay, formatDateKey, mapBookingsToEvents, mapScheduledSessionsToEvents, startOfLocalDay } from "./utils";

function mapScheduledProgramsToEvents(programs: any[]): ScheduleEvent[] {
  return programs
    .filter((p) => p.scheduledDate)
    .map((p) => {
      const d = new Date(p.scheduledDate);
      const dateKey = formatDateKey(d);
      const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      return {
        id: `program-${p.id}`,
        dayId: dateKey,
        dateKey,
        startsAt: p.scheduledDate,
        title: p.name,
        timeStart: timeStr === "00:00" ? "All day" : timeStr,
        timeEnd: "",
        location: "",
        meetingLink: null,
        type: "training" as const,
        tag: "Program",
        athlete: "",
        coach: "",
        notes: p.description ?? "",
        status: "confirmed",
      };
    });
}

export function useScheduleData(token: string | null, profileId: number, isFocused: boolean) {
  const eventsQuery = useQuery({
    queryKey: queryKeys.bookings.all(profileId),
    queryFn: async () => {
      try {
        const data = await apiRequest<{ sessions: any[] }>("/sessions/my", { token });
        return mapScheduledSessionsToEvents(data.sessions ?? []);
      } catch {
        const data = await apiRequest<{ items: any[] }>("/bookings", { token });
        return mapBookingsToEvents(data.items ?? []);
      }
    },
    enabled: !!token && isFocused,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const programsQuery = useQuery({
    queryKey: ["programs", "scheduled", profileId] as const,
    queryFn: async () => {
      const data = await apiRequest<{ programs: any[] }>("/programs/my-assigned", { token });
      return mapScheduledProgramsToEvents(data.programs ?? []);
    },
    enabled: !!token && isFocused,
    staleTime: 5 * 60 * 1000,
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

  const scheduledPrograms = programsQuery.data ?? [];
  const allEvents = [...(eventsQuery.data ?? []), ...scheduledPrograms];

  return {
    events: allEvents,
    eventsLoading: eventsQuery.isLoading,
    eventsError: (eventsQuery.error as any)?.message ?? null,
    services: servicesQuery.data ?? [],
    servicesLoading: servicesQuery.isLoading,
    servicesError: (servicesQuery.error as any)?.message ?? null,
    refreshEvents: () => { eventsQuery.refetch(); programsQuery.refetch(); },
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

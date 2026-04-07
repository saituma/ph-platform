import { useCallback, useEffect, useState } from "react";
import { InteractionManager } from "react-native";
import { apiRequest } from "@/lib/api";
import { ScheduleEvent, ServiceType } from "./types";
import { mapBookingsToEvents } from "./utils";

export function useScheduleData(token: string | null, isFocused: boolean) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    if (!token) return;
    setEventsLoading(true);
    setEventsError(null);
    try {
      const data = await apiRequest<{ items: any[] }>("/bookings", { token, forceRefresh: true });
      setEvents(mapBookingsToEvents(data.items ?? []));
    } catch (err: any) {
      setEventsError(err.message ?? "Failed to load schedule");
    } finally {
      setEventsLoading(false);
    }
  }, [token]);

  const refreshServices = useCallback(async () => {
    if (!token) return;
    setServicesLoading(true);
    setServicesError(null);
    try {
      const data = await apiRequest<{ items: ServiceType[] }>("/bookings/services", {
        token,
        forceRefresh: true,
        timeoutMs: 6000,
      });
      setServices(data.items ?? []);
    } catch (err: any) {
      setServicesError(err.message ?? "Failed to load services");
    } finally {
      setServicesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !isFocused) return;
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!active) return;
      refreshEvents();
    });
    return () => {
      active = false;
      task?.cancel?.();
    };
  }, [token, isFocused, refreshEvents]);

  return {
    events,
    eventsLoading,
    eventsError,
    services,
    servicesLoading,
    servicesError,
    refreshEvents,
    refreshServices,
    setEvents,
  };
}

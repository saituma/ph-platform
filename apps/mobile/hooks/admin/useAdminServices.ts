import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ServiceType } from "@/types/admin";
import { parseIntOrUndefined } from "@/lib/admin-utils";
import { useAdminQuery, useAdminMutation } from "./useAdminQuery";

export function useAdminServices(token: string | null, canLoad: boolean) {
  const enabled = Boolean(token && canLoad);
  const [serviceEditBusyId, setServiceEditBusyId] = useState<number | null>(null);

  const fetcher = useCallback(
    async (forceRefresh: boolean) => {
      if (!token) return [];
      const res = await apiRequest<{ items?: ServiceType[] }>(
        "/bookings/services?includeInactive=true",
        { token, suppressStatusCodes: [403], skipCache: forceRefresh, forceRefresh },
      );
      return Array.isArray(res?.items) ? res.items : [];
    },
    [token],
  );

  const {
    data: services,
    loading: servicesLoading,
    error: servicesError,
    load: loadServices,
    setError: setServicesError,
  } = useAdminQuery<ServiceType[]>(fetcher, [], enabled);

  const createMutation = useAdminMutation<{
    name: string;
    type?: string | null;
    durationMinutes: string;
    description?: string;
    capacity?: string;
    totalSlots?: string;
    isActive?: boolean;
    isBookable?: boolean;
    defaultLocation?: string;
    defaultMeetingLink?: string;
    eligiblePlans?: string[];
    eligibleTargets?: string[];
    schedulePattern?: string;
    weeklyEntries?: { weekday: number; time: string }[];
    oneTimeDate?: string | null;
    oneTimeTime?: string | null;
    slotMode?: string;
    slotIntervalMinutes?: number | null;
    slotDefinitions?: { time: string; capacity?: number | null }[];
  }>(
    useCallback(
      async (params) => {
        if (!token) return;
        const name = params.name.trim();
        const type = params.type?.trim() || null;
        const durationMinutes = parseIntOrUndefined(params.durationMinutes ?? "");
        const capacity = parseIntOrUndefined(params.capacity ?? "");
        const totalSlots = parseIntOrUndefined(params.totalSlots ?? "");
        const isActive = params.isActive !== false;
        const isBookable = params.isBookable !== false;

        if (!name) throw new Error("Name is required");
        if (isBookable && !type) throw new Error("Type is required");
        if (!durationMinutes || durationMinutes < 1) throw new Error("Duration minutes is required");

        const body: Record<string, unknown> = {
          name,
          type,
          durationMinutes,
          description: params.description,
          ...(capacity !== undefined ? { capacity } : {}),
          ...(totalSlots !== undefined ? { totalSlots } : {}),
          ...(params.defaultLocation?.trim().length ? { defaultLocation: params.defaultLocation.trim() } : {}),
          ...(params.defaultMeetingLink?.trim().length ? { defaultMeetingLink: params.defaultMeetingLink.trim() } : {}),
          isActive,
          isBookable,
          eligiblePlans: params.eligiblePlans,
          eligibleTargets: params.eligibleTargets,
          schedulePattern: params.schedulePattern,
          weeklyEntries: params.weeklyEntries,
          oneTimeDate: params.oneTimeDate ?? null,
          oneTimeTime: params.oneTimeTime ?? null,
          slotMode: params.slotMode,
          slotIntervalMinutes: params.slotIntervalMinutes ?? null,
          slotDefinitions: params.slotDefinitions ?? [],
        };

        await apiRequest("/bookings/services", {
          method: "POST", token, body, suppressStatusCodes: [403], skipCache: true, forceRefresh: true,
        });
        await loadServices(true);
      },
      [token, loadServices],
    ),
  );

  const updateMutation = useAdminMutation<{ serviceId: number; patchBody: Record<string, unknown> }>(
    useCallback(
      async ({ serviceId, patchBody }) => {
        if (!token) return;
        setServiceEditBusyId(serviceId);
        try {
          await apiRequest(`/bookings/services/${serviceId}`, {
            method: "PATCH", token, body: patchBody, suppressStatusCodes: [403], skipCache: true, forceRefresh: true,
          });
          await loadServices(true);
        } finally {
          setServiceEditBusyId(null);
        }
      },
      [token, loadServices],
    ),
  );

  const deleteMutation = useAdminMutation<number>(
    useCallback(
      async (serviceId: number) => {
        if (!token) return;
        setServiceEditBusyId(serviceId);
        try {
          await apiRequest(`/bookings/services/${serviceId}`, {
            method: "DELETE", token, suppressStatusCodes: [403], skipCache: true, forceRefresh: true,
          });
          await loadServices(true);
        } finally {
          setServiceEditBusyId(null);
        }
      },
      [token, loadServices],
    ),
  );

  return {
    services,
    servicesLoading,
    servicesError,
    serviceEditBusyId,
    serviceCreateBusy: createMutation.busy,
    loadServices,
    createServiceType: (params: Parameters<typeof createMutation.run>[0]) => createMutation.run(params),
    updateServiceType: (serviceId: number, patchBody: Record<string, unknown>) =>
      updateMutation.run({ serviceId, patchBody }),
    deleteServiceType: (serviceId: number) => deleteMutation.run(serviceId),
    setServicesError,
  };
}

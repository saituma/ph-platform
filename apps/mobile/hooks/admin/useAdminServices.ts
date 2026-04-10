import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ServiceType } from "@/types/admin";
import { parseIntOrUndefined } from "@/lib/admin-utils";

export function useAdminServices(token: string | null, canLoad: boolean) {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [serviceEditBusyId, setServiceEditBusyId] = useState<number | null>(null);
  const [serviceCreateBusy, setServiceCreateBusy] = useState(false);

  const loadServices = useCallback(
    async (forceRefresh: boolean) => {
      if (!canLoad || !token) return;
      setServicesLoading(true);
      setServicesError(null);
      try {
        const res = await apiRequest<{ items?: ServiceType[] }>(
          "/bookings/services?includeInactive=true",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setServices(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setServicesError(
          e instanceof Error ? e.message : "Failed to load services",
        );
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    },
    [canLoad, token],
  );

  const createServiceType = useCallback(async (params: {
    name: string;
    type: string;
    durationMinutes: string;
    capacity: string;
    isActive: string;
    defaultLocation: string;
    defaultMeetingLink: string;
    advancedJson: string;
  }) => {
    if (!canLoad || !token) return;
    const name = params.name.trim();
    const type = params.type.trim();
    const durationMinutes = parseIntOrUndefined(params.durationMinutes);
    const capacity = parseIntOrUndefined(params.capacity);
    const isActive = params.isActive.trim().toLowerCase();

    if (!name) throw new Error("Name is required");
    if (!type) throw new Error("Type is required");
    if (!durationMinutes || durationMinutes < 1) throw new Error("Duration minutes is required");

    let advanced: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(params.advancedJson || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        advanced = parsed;
      }
    } catch {
      throw new Error("Advanced JSON must be valid JSON");
    }

    setServiceCreateBusy(true);
    try {
      const body: Record<string, unknown> = {
        name,
        type,
        durationMinutes,
        ...(capacity !== undefined ? { capacity } : {}),
        ...(params.defaultLocation.trim().length
          ? { defaultLocation: params.defaultLocation.trim() }
          : {}),
        ...(params.defaultMeetingLink.trim().length
          ? { defaultMeetingLink: params.defaultMeetingLink.trim() }
          : {}),
        ...(isActive === "true" || isActive === "false"
          ? { isActive: isActive === "true" }
          : {}),
        ...advanced,
      };

      await apiRequest("/bookings/services", {
        method: "POST",
        token,
        body,
        suppressStatusCodes: [403],
        skipCache: true,
        forceRefresh: true,
      });

      await loadServices(true);
    } finally {
      setServiceCreateBusy(false);
    }
  }, [canLoad, loadServices, token]);

  const updateServiceType = useCallback(
    async (serviceId: number, patchBody: Record<string, unknown>) => {
      if (!canLoad || !token) return;
      setServiceEditBusyId(serviceId);
      try {
        await apiRequest(`/bookings/services/${serviceId}`, {
          method: "PATCH",
          token,
          body: patchBody,
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
        await loadServices(true);
      } finally {
        setServiceEditBusyId(null);
      }
    },
    [canLoad, loadServices, token],
  );

  const deleteServiceType = useCallback(
    async (serviceId: number) => {
      if (!canLoad || !token) return;
      setServiceEditBusyId(serviceId);
      try {
        await apiRequest(`/bookings/services/${serviceId}`, {
          method: "DELETE",
          token,
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
        await loadServices(true);
      } finally {
        setServiceEditBusyId(null);
      }
    },
    [canLoad, loadServices, token],
  );

  return {
    services,
    servicesLoading,
    servicesError,
    serviceEditBusyId,
    serviceCreateBusy,
    loadServices,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    setServicesError,
  };
}

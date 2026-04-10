import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AdminAvailabilityBlock } from "@/types/admin";
import { parseIntOrUndefined } from "@/lib/admin-utils";

export function useAdminAvailability(token: string | null, canLoad: boolean) {
  const [availability, setAvailability] = useState<AdminAvailabilityBlock[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityCreateBusy, setAvailabilityCreateBusy] = useState(false);

  const loadAvailability = useCallback(
    async (forceRefresh: boolean) => {
      if (!canLoad || !token) return;
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const res = await apiRequest<{ items?: AdminAvailabilityBlock[] }>(
          "/admin/availability",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setAvailability(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setAvailabilityError(e instanceof Error ? e.message : "Failed to load availability");
        setAvailability([]);
      } finally {
        setAvailabilityLoading(false);
      }
    },
    [canLoad, token],
  );

  const createAvailabilityBlock = useCallback(async (params: {
    serviceTypeId: string;
    startsAt: string;
    endsAt: string;
  }) => {
    if (!canLoad || !token) return;
    const serviceTypeId = parseIntOrUndefined(params.serviceTypeId);
    if (!serviceTypeId) throw new Error("Service Type ID is required");
    
    const startsAt = params.startsAt.trim();
    const endsAt = params.endsAt.trim();
    if (!startsAt || !endsAt) throw new Error("Start and end ISO datetimes are required");

    setAvailabilityCreateBusy(true);
    try {
      await apiRequest("/bookings/availability", {
        method: "POST",
        token,
        body: { serviceTypeId, startsAt, endsAt },
        suppressStatusCodes: [403],
        skipCache: true,
        forceRefresh: true,
      });
      await loadAvailability(true);
    } finally {
      setAvailabilityCreateBusy(false);
    }
  }, [canLoad, loadAvailability, token]);

  return {
    availability,
    availabilityLoading,
    availabilityError,
    availabilityCreateBusy,
    loadAvailability,
    createAvailabilityBlock,
    setAvailabilityError,
  };
}

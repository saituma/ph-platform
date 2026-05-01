import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { AdminAvailabilityBlock } from "@/types/admin";
import { parseIntOrUndefined } from "@/lib/admin-utils";
import { useAdminQuery, useAdminMutation } from "./useAdminQuery";

export function useAdminAvailability(token: string | null, canLoad: boolean) {
  const fetcher = useCallback(
    (forceRefresh: boolean) =>
      apiRequest<{ items?: AdminAvailabilityBlock[] }>("/admin/availability", {
        token,
        suppressStatusCodes: [403],
        skipCache: forceRefresh,
        forceRefresh,
      }).then((res) => (Array.isArray(res?.items) ? res.items : [])),
    [token],
  );

  const {
    data: availability,
    loading: availabilityLoading,
    error: availabilityError,
    load: loadAvailability,
    setError: setAvailabilityError,
  } = useAdminQuery(fetcher, [] as AdminAvailabilityBlock[], Boolean(token) && canLoad);

  const {
    run: createAvailabilityBlock,
    busy: availabilityCreateBusy,
  } = useAdminMutation(
    useCallback(
      async (params: { serviceTypeId: string; startsAt: string; endsAt: string }) => {
        const serviceTypeId = parseIntOrUndefined(params.serviceTypeId);
        if (!serviceTypeId) throw new Error("Service Type ID is required");
        const startsAt = params.startsAt.trim();
        const endsAt = params.endsAt.trim();
        if (!startsAt || !endsAt) throw new Error("Start and end ISO datetimes are required");

        await apiRequest("/bookings/availability", {
          method: "POST",
          token,
          body: { serviceTypeId, startsAt, endsAt },
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
        await loadAvailability(true);
      },
      [token, loadAvailability],
    ),
  );

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

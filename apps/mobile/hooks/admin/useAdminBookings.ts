import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AdminBooking, AdminBookingDetail, AdminUserLite } from "@/types/admin";
import { parseIntOrUndefined } from "@/lib/admin-utils";
import { useAdminMutation } from "./useAdminQuery";
import { parseApiError } from "@/lib/errors";

export function useAdminBookings(token: string | null, canLoad: boolean) {
  const enabled = Boolean(token && canLoad);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Record<number, AdminBookingDetail | undefined>>({});
  const [bookingDetailLoadingIds, setBookingDetailLoadingIds] = useState<Record<number, boolean>>({});
  const [bookingMutatingId, setBookingMutatingId] = useState<number | null>(null);

  const [createBookingUsers, setCreateBookingUsers] = useState<AdminUserLite[]>([]);

  const loadBookings = useCallback(
    async (query: string, limitStr: string, forceRefresh: boolean) => {
      if (!enabled) return;
      setBookingsLoading(true);
      setBookingsError(null);
      try {
        const q = query.trim();
        const limit = parseIntOrUndefined(limitStr) ?? 50;
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("limit", String(limit));
        const res = await apiRequest<{ bookings?: AdminBooking[] }>(
          `/admin/bookings?${params.toString()}`,
          { token: token!, suppressStatusCodes: [403], skipCache: forceRefresh, forceRefresh },
        );
        setBookings(Array.isArray(res?.bookings) ? res.bookings : []);
      } catch (e) {
        setBookingsError(parseApiError(e).message);
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    },
    [enabled, token],
  );

  const loadBookingDetail = useCallback(
    async (bookingId: number, forceRefresh: boolean) => {
      if (!enabled || !bookingId) return;
      setBookingDetailLoadingIds((prev) => ({ ...prev, [bookingId]: true }));
      try {
        const res = await apiRequest<{ booking?: AdminBookingDetail }>(
          `/admin/bookings/${bookingId}`,
          { token: token!, suppressStatusCodes: [403], skipCache: forceRefresh, forceRefresh },
        );
        setBookingDetails((prev) => ({ ...prev, [bookingId]: res?.booking }));
      } catch (e) {
        setBookingDetails((prev) => ({
          ...prev,
          [bookingId]: { id: bookingId, status: "pending" } as any,
        }));
        throw e;
      } finally {
        setBookingDetailLoadingIds((prev) => ({ ...prev, [bookingId]: false }));
      }
    },
    [enabled, token],
  );

  const statusMutation = useAdminMutation<{
    bookingId: number;
    status: string;
    onComplete?: () => Promise<void>;
    updates?: Record<string, any>;
  }>(
    useCallback(
      async ({ bookingId, status, onComplete, updates }) => {
        if (!enabled) return;
        setBookingMutatingId(bookingId);
        try {
          await apiRequest(`/admin/bookings/${bookingId}`, {
            method: "PATCH",
            token: token!,
            body: { status, ...updates },
            suppressStatusCodes: [403],
            skipCache: true,
            forceRefresh: true,
          });
          if (onComplete) await onComplete();
        } finally {
          setBookingMutatingId(null);
        }
      },
      [enabled, token],
    ),
  );

  const searchUsers = useCallback(
    async (query: string, forceRefresh: boolean) => {
      if (!enabled) return;
      const q = query.trim();
      if (!q) {
        setCreateBookingUsers([]);
        return;
      }
      try {
        const params = new URLSearchParams();
        params.set("q", q);
        params.set("limit", "25");
        const res = await apiRequest<{ users?: AdminUserLite[] }>(
          `/admin/users?${params.toString()}`,
          { token: token!, suppressStatusCodes: [403], skipCache: forceRefresh, forceRefresh },
        );
        setCreateBookingUsers(Array.isArray(res?.users) ? res.users : []);
      } catch {
        setCreateBookingUsers([]);
      }
    },
    [enabled, token],
  );

  const createMutation = useAdminMutation<{
    userId: number;
    serviceTypeId: number;
    startsAt: string;
    endsAt: string;
    location?: string;
    meetingLink?: string;
  }>(
    useCallback(
      async (params) => {
        if (!enabled) return;
        await apiRequest("/admin/bookings", {
          method: "POST",
          token: token!,
          body: { ...params, status: "confirmed" },
          suppressStatusCodes: [400, 403],
          skipCache: true,
          forceRefresh: true,
        });
      },
      [enabled, token],
    ),
  );

  return {
    bookings,
    bookingsLoading,
    bookingsError,
    bookingDetails,
    bookingDetailLoadingIds,
    bookingMutatingId,
    createBookingUsers,
    createBookingBusy: createMutation.busy,
    loadBookings,
    loadBookingDetail,
    updateBookingStatus: (bookingId: number, status: string, onComplete?: () => Promise<void>, updates?: Record<string, any>) =>
      statusMutation.run({ bookingId, status, onComplete, updates }),
    searchUsers,
    createBooking: (params: {
      userId: number;
      serviceTypeId: number;
      startsAt: string;
      endsAt: string;
      location?: string;
      meetingLink?: string;
    }) => createMutation.run(params),
    setBookingsError,
    setCreateBookingUsers,
  };
}

import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AdminBooking, AdminBookingDetail, AdminUserLite } from "@/types/admin";
import { parseIntOrUndefined } from "@/lib/admin-utils";

export function useAdminBookings(token: string | null, canLoad: boolean) {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Record<number, AdminBookingDetail | undefined>>({});
  const [bookingDetailLoadingIds, setBookingDetailLoadingIds] = useState<Record<number, boolean>>({});
  const [bookingMutatingId, setBookingMutatingId] = useState<number | null>(null);

  const [createBookingUsers, setCreateBookingUsers] = useState<AdminUserLite[]>([]);
  const [createBookingBusy, setCreateBookingBusy] = useState(false);

  const loadBookings = useCallback(
    async (query: string, limitStr: string, forceRefresh: boolean) => {
      if (!canLoad || !token) return;
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
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setBookings(Array.isArray(res?.bookings) ? res.bookings : []);
      } catch (e) {
        setBookingsError(e instanceof Error ? e.message : "Failed to load bookings");
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    },
    [canLoad, token],
  );

  const loadBookingDetail = useCallback(
    async (bookingId: number, forceRefresh: boolean) => {
      if (!canLoad || !token || !bookingId) return;
      setBookingDetailLoadingIds((prev) => ({ ...prev, [bookingId]: true }));
      try {
        const res = await apiRequest<{ booking?: AdminBookingDetail }>(
          `/admin/bookings/${bookingId}`,
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        const detail = res?.booking;
        setBookingDetails((prev) => ({ ...prev, [bookingId]: detail }));
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
    [canLoad, token],
  );

  const updateBookingStatus = useCallback(
    async (bookingId: number, status: string, onComplete?: () => Promise<void>) => {
      if (!canLoad || !token) return;
      setBookingMutatingId(bookingId);
      try {
        await apiRequest(`/admin/bookings/${bookingId}`, {
          method: "PATCH",
          token,
          body: { status },
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
        if (onComplete) await onComplete();
      } finally {
        setBookingMutatingId(null);
      }
    },
    [canLoad, token],
  );

  const searchUsers = useCallback(
    async (query: string, forceRefresh: boolean) => {
      if (!canLoad || !token) return;
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
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setCreateBookingUsers(Array.isArray(res?.users) ? res.users : []);
      } catch (e) {
        setCreateBookingUsers([]);
        throw e;
      }
    },
    [canLoad, token],
  );

  const createBooking = useCallback(async (params: {
    userId: number;
    serviceTypeId: number;
    startsAt: string;
    endsAt: string;
    location?: string;
    meetingLink?: string;
  }) => {
    if (!canLoad || !token) return;
    setCreateBookingBusy(true);
    try {
      await apiRequest("/admin/bookings", {
        method: "POST",
        token,
        body: {
          ...params,
          status: "confirmed",
        },
        suppressStatusCodes: [400, 403],
        skipCache: true,
        forceRefresh: true,
      });
    } finally {
      setCreateBookingBusy(false);
    }
  }, [canLoad, token]);

  return {
    bookings,
    bookingsLoading,
    bookingsError,
    bookingDetails,
    bookingDetailLoadingIds,
    bookingMutatingId,
    createBookingUsers,
    createBookingBusy,
    loadBookings,
    loadBookingDetail,
    updateBookingStatus,
    searchUsers,
    createBooking,
    setBookingsError,
    setCreateBookingUsers,
  };
}

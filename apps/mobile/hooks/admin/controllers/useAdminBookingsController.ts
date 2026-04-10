import { useState, useCallback, useEffect } from "react";
import { useAdminBookings } from "../useAdminBookings";
import { ServiceType, AdminUserLite } from "@/types/admin";

export function useAdminBookingsController(token: string | null, canLoad: boolean, services: ServiceType[], initialAction?: string | null) {
  const bookingsHook = useAdminBookings(token, canLoad);

  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingLimit, setBookingLimit] = useState("50");
  const [bookingDetailOpenId, setBookingDetailOpenId] = useState<number | null>(null);

  // Create booking state
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [createBookingUserQuery, setCreateBookingUserQuery] = useState("");
  const [createBookingSelectedUser, setCreateBookingSelectedUser] = useState<AdminUserLite | null>(null);
  const [createBookingServiceId, setCreateBookingServiceId] = useState<number | null>(null);
  const [createBookingDate, setCreateBookingDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [createBookingTime, setCreateBookingTime] = useState<Date>(() => {
    const t = new Date();
    t.setHours(9, 0, 0, 0);
    return t;
  });
  const [createBookingShowDatePicker, setCreateBookingShowDatePicker] = useState(false);
  const [createBookingShowTimePicker, setCreateBookingShowTimePicker] = useState(false);
  const [createBookingLocation, setCreateBookingLocation] = useState("");
  const [createBookingMeetingLink, setCreateBookingMeetingLink] = useState("");
  const [createBookingError, setCreateBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (canLoad) {
      bookingsHook.loadBookings(bookingQuery, bookingLimit, false);
    }
  }, [canLoad]);

  useEffect(() => {
    if (initialAction === "createBooking") {
      setCreateBookingOpen(true);
    }
  }, [initialAction]);

  const handleUpdateStatus = useCallback(async (id: number, status: "confirmed" | "declined" | "cancelled") => {
    await bookingsHook.updateBookingStatus(id, status, async () => {
      await bookingsHook.loadBookings(bookingQuery, bookingLimit, true);
      if (bookingDetailOpenId === id) {
        await bookingsHook.loadBookingDetail(id, true);
      }
    });
  }, [bookingDetailOpenId, bookingLimit, bookingQuery, bookingsHook]);

  const submitCreateBooking = useCallback(async () => {
    const userId = createBookingSelectedUser?.id;
    if (!userId) {
      setCreateBookingError("Pick a user first.");
      return;
    }
    if (!createBookingServiceId) {
      setCreateBookingError("Pick a service type first.");
      return;
    }
    const service = services.find((s) => s.id === createBookingServiceId);
    if (!service) {
      setCreateBookingError("Service type not found.");
      return;
    }

    const durationMinutes = Number(service.durationMinutes ?? 30);
    
    // Auto-calculate start time from the Service configuration
    let startsAt = new Date();
    
    if (service.schedulePatternOptions && typeof service.schedulePatternOptions === 'object') {
      const opts = service.schedulePatternOptions as any;
      if (opts.oneTimeDate && opts.oneTimeTime) {
         try {
           const [hr, mn] = opts.oneTimeTime.split(":");
           startsAt = new Date(`${opts.oneTimeDate}T${hr.padStart(2, '0')}:${mn.padStart(2, '0')}:00`);
         } catch(e) {}
      }
    } else {
      // If permanent and no oneTimeDate is set, we fallback to today at 12:00
      startsAt.setHours(12, 0, 0, 0);
    }

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

    try {
      setCreateBookingError(null);
      await bookingsHook.createBooking({
        userId,
        serviceTypeId: createBookingServiceId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: createBookingLocation.trim() || undefined,
        meetingLink: createBookingMeetingLink.trim() || undefined,
      });
      setCreateBookingOpen(false);
      await bookingsHook.loadBookings(bookingQuery, bookingLimit, true);
    } catch (e) {
      setCreateBookingError(e instanceof Error ? e.message : "Failed to create booking");
    }
  }, [createBookingDate, createBookingLocation, createBookingMeetingLink, createBookingSelectedUser?.id, createBookingServiceId, createBookingTime, services, bookingsHook, bookingQuery, bookingLimit]);

  return {
    bookingsHook,
    search: {
      query: bookingQuery, setQuery: setBookingQuery,
      limit: bookingLimit, setLimit: setBookingLimit,
    },
    detail: {
      openId: bookingDetailOpenId, setOpenId: setBookingDetailOpenId,
    },
    create: {
      isOpen: createBookingOpen, setOpen: setCreateBookingOpen,
      userQuery: createBookingUserQuery, setUserQuery: setCreateBookingUserQuery,
      selectedUser: createBookingSelectedUser, setSelectedUser: setCreateBookingSelectedUser,
      serviceId: createBookingServiceId, setServiceId: setCreateBookingServiceId,
      date: createBookingDate, setDate: setCreateBookingDate,
      time: createBookingTime, setTime: setCreateBookingTime,
      showDatePicker: createBookingShowDatePicker, setShowDatePicker: setCreateBookingShowDatePicker,
      showTimePicker: createBookingShowTimePicker, setShowTimePicker: setCreateBookingShowTimePicker,
      location: createBookingLocation, setLocation: setCreateBookingLocation,
      meetingLink: createBookingMeetingLink, setMeetingLink: setCreateBookingMeetingLink,
      error: createBookingError,
      submit: submitCreateBooking,
    },
    handleUpdateStatus,
  };
}

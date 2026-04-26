"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { BookingServicesPanel } from "../../components/admin/bookings/booking-services-panel";
import {
  BookingsDialogs,
  type BookingsDialog,
} from "../../components/admin/bookings/bookings-dialogs";
import { BookingsFilters } from "../../components/admin/bookings/bookings-filters";
import { BookingsList } from "../../components/admin/bookings/bookings-list";
import {
  useGetBookingsQuery,
  useGetServicesQuery,
  useGetUsersQuery,
  useUpdateBookingStatusMutation,
} from "@/lib/apiSlice";

type BookingItem = {
  id: number;
  serviceTypeId?: number | null;
  name: string;
  athlete: string;
  time: string;
  type: string;
  status?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  startsAt?: string | null;
  endTime?: string | null;
};

type ServiceType = {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  totalSlots?: number | null;
  remainingTotalSlots?: number | null;
  fixedStartTime?: string | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  eligiblePlans?: string[] | null;
  eligibleTargets?: string[] | null;
  schedulePattern?: string | null;
  recurrenceEndMode?: string | null;
  recurrenceCount?: number | null;
  weeklyEntries?: { weekday: number; time: string }[] | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  slotMode?: string | null;
  slotIntervalMinutes?: number | null;
  slotDefinitions?: { time: string; capacity?: number | null }[] | null;
  isActive?: boolean | null;
};

type RawBooking = {
  id: number;
  serviceTypeId?: number | null;
  serviceName?: string | null;
  athleteName?: string | null;
  startsAt?: string | null;
  type?: string | null;
  status?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  endTime?: string | null;
};

export default function BookingsPage() {
  const [activeDialog, setActiveDialog] = useState<BookingsDialog>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(
    null,
  );
  const [selectedService, setSelectedService] = useState<ServiceType | null>(
    null,
  );
  const [activeChip, setActiveChip] = useState<string>("All");

  const chips = ["All", "Group", "Individual", "Lift Lab", "Premium"];
  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useGetBookingsQuery();
  const {
    data: servicesData,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = useGetServicesQuery();
  const { data: usersData } = useGetUsersQuery();
  const [updateBookingStatus, { isLoading: isUpdatingBooking }] =
    useUpdateBookingStatusMutation();
  const isLoading = bookingsLoading || servicesLoading;

  const bookings = useMemo<BookingItem[]>(() => {
    const items: RawBooking[] = Array.isArray(bookingsData?.bookings)
      ? bookingsData.bookings
      : [];
    return items.map((item) => ({
      id: item.id,
      serviceTypeId: item.serviceTypeId ?? null,
      name: item.serviceName ?? item.type ?? "Session",
      athlete: item.athleteName ?? "Unknown athlete",
      time: item.startsAt
        ? new Date(item.startsAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--",
      type: item.type ?? "Session",
      status: item.status ?? null,
      location: item.location ?? null,
      meetingLink: item.meetingLink ?? null,
      startsAt: item.startsAt ?? null,
      endTime: item.endTime ?? null,
    }));
  }, [bookingsData]);

  const services = useMemo<ServiceType[]>(
    () => servicesData?.items ?? [],
    [servicesData],
  );
  const filteredBookings = useMemo(() => {
    if (activeChip === "All") return bookings;
    if (activeChip === "Group")
      return bookings.filter((booking) => booking.type === "group_call");
    if (activeChip === "Individual")
      return bookings.filter((booking) =>
        ["individual_call", "one_on_one"].includes(booking.type),
      );
    if (activeChip === "Lift Lab")
      return bookings.filter((booking) => booking.type === "lift_lab_1on1");
    if (activeChip === "Premium")
      return bookings.filter((booking) => booking.type === "role_model");
    return bookings;
  }, [activeChip, bookings]);

  const now = new Date();
  const upcomingBookings = filteredBookings.filter((booking) => {
    const s = booking.status?.toLowerCase();
    if (s === "cancelled" || s === "declined") return false;
    if (!booking.startsAt) return true;
    return new Date(booking.startsAt) >= now;
  });
  const pastBookings = filteredBookings.filter((booking) => {
    const s = booking.status?.toLowerCase();
    if (s === "cancelled" || s === "declined") return false;
    if (!booking.startsAt) return false;
    return new Date(booking.startsAt) < now;
  });
  const cancelledBookings = filteredBookings.filter((booking) => {
    const s = booking.status?.toLowerCase();
    return s === "cancelled" || s === "declined";
  });

  return (
    <AdminShell
      title="Bookings"
      subtitle="Manage bookable services, capacities, and client bookings."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2 w-full min-w-0">
          <CardHeader>
            <SectionHeader
              title="Services"
              description="See every bookable session type, edit details, control capacity, and turn visibility on or off."
            />
          </CardHeader>
          <CardContent>
            <BookingServicesPanel
              services={services}
              isLoading={servicesLoading}
              onAddService={() => setActiveDialog("new-service")}
              onEditService={(s) => {
                setSelectedService(s);
                setActiveDialog("edit-service");
              }}
              onRefetch={() => {
                refetchServices();
                refetchBookings();
              }}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-start-2">
          <CardHeader>
            <SectionHeader
              title="Book for a client"
              description="Place a booking as admin (bypasses availability if needed)."
            />
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setActiveDialog("new-booking")}
            >
              Create booking
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="space-y-4">
            <SectionHeader
              title="Upcoming"
              description="Pending and confirmed bookings"
            />

            <BookingsFilters chips={chips} onChipSelect={setActiveChip} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading bookings...
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                No upcoming bookings.
              </div>
            ) : (
              <BookingsList
                bookings={upcomingBookings}
                isLoading={isLoading}
                onSelect={(booking) => {
                  setSelectedBooking(booking);
                  setActiveDialog("booking-details");
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Past Bookings"
              description="Completed sessions for the selected date."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                Loading requests...
              </div>
            ) : pastBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                No past bookings.
              </div>
            ) : (
              pastBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {booking.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.athlete} • {booking.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setActiveDialog("booking-details");
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {cancelledBookings.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <SectionHeader
              title="Cancelled & Declined"
              description="Bookings the client cancelled from the app, or that were declined."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {cancelledBookings.map((booking) => {
              const start = booking.startsAt ? new Date(booking.startsAt) : null;
              const dateLabel = start
                ? start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
                : "TBD";
              const isCancelled = booking.status?.toLowerCase() === "cancelled";
              return (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-border bg-secondary/20 p-4 opacity-70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground line-through">
                        {booking.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.athlete} • {dateLabel} {booking.time !== "--" ? `• ${booking.time}` : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium text-destructive">
                        {isCancelled ? "Cancelled by client" : "Declined"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setActiveDialog("booking-details");
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <BookingsDialogs
        active={activeDialog}
        onClose={() => {
          setActiveDialog(null);
          setSelectedService(null);
        }}
        bookings={bookings}
        selectedBooking={selectedBooking}
        services={services}
        users={usersData?.users ?? []}
        selectedService={selectedService}
        isApproving={isUpdatingBooking}
        onApproveBooking={async ({
          bookingId,
          startsAt,
          endTime,
          meetingLink,
        }) => {
          await updateBookingStatus({
            bookingId,
            status: "confirmed",
            startsAt,
            endTime: endTime ?? undefined,
            meetingLink: meetingLink ?? undefined,
          }).unwrap();
          refetchBookings();
          setActiveDialog(null);
        }}
        onDeclineBooking={async (bookingId) => {
          await updateBookingStatus({ bookingId, status: "declined" }).unwrap();
          refetchBookings();
          setActiveDialog(null);
        }}
        onRefresh={() => {
          refetchBookings();
          refetchServices();
        }}
      />
    </AdminShell>
  );
}

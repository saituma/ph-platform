"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { BookingsDialogs, type BookingsDialog } from "../../components/admin/bookings/bookings-dialogs";
import { BookingsFilters } from "../../components/admin/bookings/bookings-filters";
import { BookingsList } from "../../components/admin/bookings/bookings-list";
import {
  useGetBookingsQuery,
  useGetServicesQuery,
  useGetUsersQuery,
  useUpdateBookingStatusMutation,
} from "../../lib/apiSlice";

type BookingItem = {
  id: number;
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
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  fixedStartTime?: string | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  isActive?: boolean | null;
};

export default function BookingsPage() {
  const [activeDialog, setActiveDialog] = useState<BookingsDialog>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const chips = ["All", "Group", "Individual", "Lift Lab", "Premium"];
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useGetBookingsQuery();
  const { data: servicesData, isLoading: servicesLoading, refetch: refetchServices } = useGetServicesQuery();
  const { data: usersData } = useGetUsersQuery();
  const [updateBookingStatus, { isLoading: isUpdatingBooking }] = useUpdateBookingStatusMutation();
  const isLoading = bookingsLoading || servicesLoading;

  const bookings = useMemo<BookingItem[]>(() => {
    const items = bookingsData?.bookings ?? [];
    return items.map((item: any) => ({
      id: item.id,
      name: item.serviceName ?? item.type ?? "Session",
      athlete: item.athleteName ?? "Unknown athlete",
      time: item.startsAt
        ? new Date(item.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "--",
      type: item.type ?? "Session",
      status: item.status ?? null,
      location: item.location ?? null,
      meetingLink: item.meetingLink ?? null,
      startsAt: item.startsAt ?? null,
      endTime: item.endTime ?? null,
    }));
  }, [bookingsData]);

  const services = useMemo<ServiceType[]>(() => servicesData?.items ?? [], [servicesData]);
  const pendingBookings = useMemo(
    () => bookings.filter((booking) => ["pending", "requested"].includes(booking.status ?? "")),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    if (activeChip === "All") return bookings;
    if (activeChip === "Group") return bookings.filter((booking) => booking.type === "group_call");
    if (activeChip === "Individual")
      return bookings.filter((booking) => ["individual_call", "one_on_one"].includes(booking.type));
    if (activeChip === "Lift Lab") return bookings.filter((booking) => booking.type === "lift_lab_1on1");
    if (activeChip === "Premium") return bookings.filter((booking) => booking.type === "role_model");
    return bookings;
  }, [activeChip, bookings]);

  return (
    <AdminShell
      title="Bookings"
      subtitle="Manage availability and sessions with Coach Mike Green."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <SectionHeader title="New Booking" description="Create a booking for a guardian." />
          </CardHeader>
          <CardContent>
            <Button onClick={() => setActiveDialog("new-booking")}>Create Booking</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionHeader title="Open Slots" description="Add availability for a service." />
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setActiveDialog("open-slots")}>
              Open Slots
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionHeader title="New Service" description="Add a new booking type." />
          </CardHeader>
          <CardContent>
            <Button onClick={() => setActiveDialog("new-service")}>New Service</Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="space-y-4">
            <SectionHeader
              title="Upcoming"
              description="Pending and confirmed booking requests."
              actionLabel="Calendar"
              onAction={() => setActiveDialog("calendar")}
            />
            <BookingsFilters chips={chips} onChipSelect={setActiveChip} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading bookings...
              </div>
            ) : (
              <BookingsList
                bookings={filteredBookings}
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
              title="Booking Requests"
              description="Latest requests awaiting review."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                Loading requests...
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                No new booking requests.
              </div>
            ) : (
              pendingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{booking.name}</p>
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
                      <Button
                        size="sm"
                        onClick={async () => {
                          await updateBookingStatus({ bookingId: booking.id, status: "confirmed" }).unwrap();
                          refetchBookings();
                        }}
                        disabled={isUpdatingBooking}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <BookingsDialogs
        active={activeDialog}
        onClose={() => {
          setActiveDialog(null);
          setSelectedService(null);
        }}
        selectedBooking={selectedBooking}
        services={services}
        users={usersData?.users ?? []}
        selectedService={selectedService}
        isApproving={isUpdatingBooking}
        onApproveBooking={async (bookingId) => {
          await updateBookingStatus({ bookingId, status: "confirmed" }).unwrap();
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

"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { BookingsDialogs, type BookingsDialog } from "../../components/admin/bookings/bookings-dialogs";
import { BookingsFilters } from "../../components/admin/bookings/bookings-filters";
import { BookingsList } from "../../components/admin/bookings/bookings-list";
import { useGetBookingsQuery, useGetServicesQuery, useUpdateServiceMutation } from "../../lib/apiSlice";

type BookingItem = {
  name: string;
  athlete: string;
  time: string;
  type: string;
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
  const typeLabel = (type: string) => {
    switch (type) {
      case "call":
        return "Call";
      case "group_call":
        return "Group call";
      case "individual_call":
      case "one_on_one":
        return "Individual call";
      case "lift_lab_1on1":
        return "Lift Lab 1:1";
      case "role_model":
        return "Role model (Premium)";
      default:
        return type;
    }
  };
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useGetBookingsQuery();
  const { data: servicesData, isLoading: servicesLoading, refetch: refetchServices } = useGetServicesQuery();
  const [updateService, { isLoading: isUpdatingService }] = useUpdateServiceMutation();
  const isLoading = bookingsLoading || servicesLoading;

  const bookings = useMemo<BookingItem[]>(() => {
    const items = bookingsData?.bookings ?? [];
    return items.map((item: any) => ({
      name: item.serviceName ?? item.type ?? "Session",
      athlete: item.athleteName ?? "Unknown athlete",
      time: item.startsAt
        ? new Date(item.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "--",
      type: item.type ?? "Session",
    }));
  }, [bookingsData]);

  const services = useMemo<ServiceType[]>(() => servicesData?.items ?? [], [servicesData]);
  const activeServices = useMemo(
    () => services.filter((service) => service.isActive !== false),
    [services],
  );
  const bookingTypes = useMemo(
    () => (activeServices.length ? activeServices.map((service) => service.name) : [
      "Calls",
      "Group calls",
      "Individual calls",
      "Lift Lab 1:1",
      "Role model meetings (Premium)",
    ]),
    [activeServices],
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
      actions={<Button onClick={() => setActiveDialog("new-service")}>New Service</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="space-y-4">
            <SectionHeader
              title="Upcoming"
              description="Next confirmed sessions."
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

        {/* Availability panel removed */}

        <Card>
          <CardHeader>
            <SectionHeader
              title="Schedule Rules"
              description="Configure booking types and call rules."
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Booking Types</p>
              <div className="flex flex-wrap gap-2">
                {bookingTypes.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Booking Flow</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>User selects service type</li>
                <li>Available time slots are displayed</li>
                <li>User confirms booking</li>
                <li>Confirmation screen is shown</li>
                <li>Email and push notification are sent</li>
              </ol>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Service Rules</p>
              {services.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                  No services yet. Create one to configure rules.
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-border bg-secondary/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {service.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabel(service.type)} • {service.durationMinutes} mins
                          </p>
                          {service.isActive === false ? (
                            <span className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[1.4px] text-muted-foreground">
                              Inactive
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedService(service);
                              setActiveDialog("edit-service");
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await updateService({
                                id: service.id,
                                data: { isActive: service.isActive === false },
                              }).unwrap();
                              refetchServices();
                            }}
                            disabled={isUpdatingService}
                          >
                            {service.isActive === false ? "Activate" : "Deactivate"}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div>Capacity: {service.capacity ?? "Unlimited"}</div>
                        <div>Attendee visibility: {service.attendeeVisibility ? "On" : "Off"}</div>
                        <div>Fixed time: {service.fixedStartTime ?? (service.type === "role_model" ? "13:00" : "None")}</div>
                        <div>Location: {service.defaultLocation ?? "None"}</div>
                        <div>Video link: {service.defaultMeetingLink ?? "None"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
        selectedService={selectedService}
        onRefresh={() => {
          refetchBookings();
          refetchServices();
        }}
      />
    </AdminShell>
  );
}

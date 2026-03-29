"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { BookingServicesPanel } from "../../components/admin/bookings/booking-services-panel";
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
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [openSlotsInitialServiceId, setOpenSlotsInitialServiceId] = useState("");
  const [activeChip, setActiveChip] = useState<string>("All");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const chips = ["All", "Group", "Individual", "Lift Lab", "Premium"];
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useGetBookingsQuery();
  const { data: servicesData, isLoading: servicesLoading, refetch: refetchServices } = useGetServicesQuery();
  const { data: usersData } = useGetUsersQuery();
  const [updateBookingStatus, { isLoading: isUpdatingBooking }] = useUpdateBookingStatusMutation();
  const isLoading = bookingsLoading || servicesLoading;
  const [popoverBooking, setPopoverBooking] = useState<BookingItem | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [popoverRect, setPopoverRect] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null
  );
  const popoverRef = useRef<HTMLDivElement | null>(null);


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
  const filteredBookings = useMemo(() => {
    if (activeChip === "All") return bookings;
    if (activeChip === "Group") return bookings.filter((booking) => booking.type === "group_call");
    if (activeChip === "Individual")
      return bookings.filter((booking) => ["individual_call", "one_on_one"].includes(booking.type));
    if (activeChip === "Lift Lab") return bookings.filter((booking) => booking.type === "lift_lab_1on1");
    if (activeChip === "Premium") return bookings.filter((booking) => booking.type === "role_model");
    return bookings;
  }, [activeChip, bookings]);

  const calendarEvents = useMemo(() => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return bookings
      .filter((booking) => booking.startsAt)
      .map((booking) => {
        const start = new Date(booking.startsAt as string);
        const end = booking.endTime ? new Date(booking.endTime) : undefined;
        const safeTitle = booking.name || booking.type || "Session";
        const dateKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
        return {
          id: String(booking.id),
          title: safeTitle,
          start: start.toISOString(),
          end: end?.toISOString(),
          allDay: false,
          extendedProps: {
            dateKey,
          },
        };
      });
  }, [bookings]);

  const bookingsById = useMemo(() => {
    const map = new Map<string, BookingItem>();
    bookings.forEach((booking) => {
      map.set(String(booking.id), booking);
    });
    return map;
  }, [bookings]);

  useEffect(() => {
    if (!popoverBooking) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPopoverBooking(null);
        setPopoverPos(null);
      }
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(event.target as Node)) return;
      setPopoverBooking(null);
      setPopoverPos(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [popoverBooking]);

  const filteredByDate = useMemo(() => {
    return filteredBookings.filter((booking) => {
      if (!booking.startsAt) return false;
      const date = new Date(booking.startsAt);
      if (Number.isNaN(date.getTime())) return false;
      const pad = (value: number) => String(value).padStart(2, "0");
      const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      return key === selectedDateKey;
    });
  }, [filteredBookings, selectedDateKey]);

  const now = new Date();
  const upcomingBookings = filteredByDate.filter((booking) => {
    if (!booking.startsAt) return true;
    return new Date(booking.startsAt) >= now;
  });
  const pastBookings = filteredByDate.filter((booking) => {
    if (!booking.startsAt) return false;
    return new Date(booking.startsAt) < now;
  });

  return (
    <AdminShell
      title="Bookings"
      subtitle="Manage bookable services, open times, and client bookings."
    >
      <Card>
        <CardHeader className="space-y-4">
          <SectionHeader title="Calendar" description="Select a date to review upcoming and past bookings." />
          <div className="w-full max-w-full rounded-2xl border border-border bg-background p-2 overflow-x-auto">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              height="auto"
              events={calendarEvents}
              dayCellClassNames={(arg) => {
                const pad = (value: number) => String(value).padStart(2, "0");
                const key = `${arg.date.getFullYear()}-${pad(arg.date.getMonth() + 1)}-${pad(arg.date.getDate())}`;
                return key === selectedDateKey ? ["fc-selected-day"] : [];
              }}
              eventClick={(info) => {
                const booking = bookingsById.get(String(info.event.id));
                if (booking) {
                  setPopoverBooking(booking);
                  setPopoverPos({ x: info.jsEvent.clientX, y: info.jsEvent.clientY });
                  const rect = info.el.getBoundingClientRect();
                  setPopoverRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
                }
              }}
              dateClick={(info) => {
                const date = info.date;
                const pad = (value: number) => String(value).padStart(2, "0");
                const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                setSelectedDateKey(key);
              }}
            />
          </div>
        </CardHeader>
      </Card>
      {popoverBooking && popoverPos ? (
        <div
          className="fixed inset-0 z-50"
          aria-hidden="true"
        >
          <div
            ref={popoverRef}
            className="absolute w-72 rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-lg"
            style={{
              left:
                typeof window !== "undefined" && window.innerWidth < 640
                  ? 16
                  : Math.min(popoverPos.x + 12, window.innerWidth - 300),
              right: typeof window !== "undefined" && window.innerWidth < 640 ? 16 : "auto",
              top:
                typeof window !== "undefined" && window.innerWidth < 640
                  ? Math.min((popoverRect?.top ?? popoverPos.y) + (popoverRect?.height ?? 0) + 12, window.innerHeight - 220)
                  : Math.min(popoverPos.y + 12, window.innerHeight - 220),
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{popoverBooking.name}</p>
                <p className="text-xs text-muted-foreground">{popoverBooking.athlete}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPopoverBooking(null);
                  setPopoverPos(null);
                }}
              >
                Close
              </Button>
            </div>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <div>
                Time:{" "}
                <span className="text-foreground">
                  {popoverBooking.startsAt
                    ? new Date(popoverBooking.startsAt).toLocaleString()
                    : popoverBooking.time}
                </span>
              </div>
              <div>
                Status: <span className="text-foreground">{popoverBooking.status ?? "unknown"}</span>
              </div>
              <div>
                Location: <span className="text-foreground">{popoverBooking.location ?? "None"}</span>
              </div>
              <div>
                Meeting: <span className="text-foreground">{popoverBooking.meetingLink ?? "None"}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedBooking(popoverBooking);
                  setActiveDialog("booking-details");
                  setPopoverBooking(null);
                  setPopoverPos(null);
                }}
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2 w-full min-w-0">
          <CardHeader>
            <SectionHeader
              title="Services"
              description="See every bookable session type, edit details, turn visibility on or off, and publish availability."
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
              onOpenSlots={(id) => {
                setOpenSlotsInitialServiceId(String(id));
                setActiveDialog("open-slots");
              }}
              onOpenSlotsAny={() => {
                setOpenSlotsInitialServiceId("");
                setActiveDialog("open-slots");
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
            <SectionHeader title="Book for a client" description="Place a booking as admin (bypasses availability if needed)." />
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setActiveDialog("new-booking")}>
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
              description="Pending and confirmed bookings for the selected date."
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
            ) : upcomingBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                No upcoming bookings for this date.
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
                No past bookings for this date.
              </div>
            ) : (
              pastBookings.map((booking) => (
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
        openSlotsInitialServiceId={openSlotsInitialServiceId}
        onClose={() => {
          setActiveDialog(null);
          setSelectedService(null);
          setOpenSlotsInitialServiceId("");
        }}
        bookings={bookings}
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

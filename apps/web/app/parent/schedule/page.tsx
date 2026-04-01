"use client";

import { useMemo, useState } from "react";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  useCreateBookingMutation,
  useGetGeneratedBookingAvailabilityQuery,
  useGetUserBookingsQuery,
} from "../../../lib/apiSlice";

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
}

function titleForType(type?: string) {
  switch (type) {
    case "group_call":
      return "Group Call";
    case "individual_call":
    case "one_on_one":
      return "Individual Call";
    case "lift_lab_1on1":
      return "Lift Lab 1:1";
    case "role_model":
      return "Premium Call";
    case "call":
      return "Call";
    default:
      return "Session";
  }
}

export default function ParentSchedulePage() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayKey);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const monthStart = useMemo(() => startOfMonth(calendarMonth), [calendarMonth]);
  const monthEnd = useMemo(() => endOfMonth(calendarMonth), [calendarMonth]);
  const { data: availabilityData, isLoading: availabilityLoading, refetch: refetchAvailability } =
    useGetGeneratedBookingAvailabilityQuery({
      from: monthStart.toISOString(),
      to: monthEnd.toISOString(),
    });
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useGetUserBookingsQuery();
  const [createBooking, { isLoading: creatingBooking }] = useCreateBookingMutation();

  const availabilityItems = useMemo(() => availabilityData?.items ?? [], [availabilityData]);
  const availableDates = useMemo(() => new Set(availabilityItems.map((item: any) => item.dateKey)), [availabilityItems]);
  const selectedDateItems = useMemo(
    () => availabilityItems.filter((item: any) => item.dateKey === selectedCalendarDate),
    [availabilityItems, selectedCalendarDate],
  );
  const bookings = useMemo(() => bookingsData?.items ?? [], [bookingsData]);

  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: ({ date: Date; key: string } | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day);
      cells.push({ date, key: toDateKey(date) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking: any) => booking.startsAt && new Date(booking.startsAt) >= now)
      .sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [bookings]);

  const handleRequest = async (item: any, slotKey?: string) => {
    setBookingError(null);
    setBookingSuccess(null);
    try {
      await createBooking({
        serviceTypeId: item.serviceTypeId,
        occurrenceKey: item.occurrenceKey,
        slotKey,
        location: item.location ?? undefined,
        meetingLink: item.meetingLink ?? undefined,
      }).unwrap();
      setBookingSuccess("Request sent. Your coach will review it.");
      await Promise.all([refetchBookings(), refetchAvailability()]);
    } catch (error: any) {
      const message =
        error?.data?.error ??
        error?.error ??
        error?.message ??
        "Failed to submit booking request.";
      setBookingError(message);
    }
  };

  return (
    <ParentShell
      title="Schedule"
      subtitle="Choose from coach-published sessions and send a request."
      actions={
        <Button onClick={() => document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth" })}>
          View Availability
        </Button>
      }
    >
      <Card id="booking-panel">
        <CardHeader>
          <CardTitle>Request a session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your coach publishes the dates and session types you can request. Pick a marked date on the calendar, then
            choose the session or slot you want.
          </p>
          {bookingError ? <p className="text-sm text-red-500">{bookingError}</p> : null}
          {bookingSuccess ? <p className="text-sm text-green-600">{bookingSuccess}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            >
              Prev
            </Button>
            <div className="text-sm font-semibold text-foreground">
              {calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            >
              Next
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className="h-10" />;
              const isSelected = cell.key === selectedCalendarDate;
              const isToday = cell.key === todayKey;
              const hasAvailability = availableDates.has(cell.key);
              return (
                <Button
                  key={cell.key}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-10 w-full ${isToday ? "border-primary" : ""}`}
                  onClick={() => {
                    setSelectedCalendarDate(cell.key);
                    setBookingError(null);
                    setBookingSuccess(null);
                  }}
                >
                  <span className="flex flex-col items-center justify-center gap-1">
                    <span>{cell.date.getDate()}</span>
                    {hasAvailability ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available on Selected Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {availabilityLoading ? (
            <p>Loading availability...</p>
          ) : selectedDateItems.length === 0 ? (
            <p>No coach-published sessions for this date yet.</p>
          ) : (
            selectedDateItems.map((item: any) => {
              const start = new Date(item.startsAt);
              const time = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const title = item.serviceName || titleForType(item.type);
              const hasSlots = Array.isArray(item.slots) && item.slots.length > 0;
              return (
                <div key={`${item.serviceTypeId}-${item.occurrenceKey}`} className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {time}
                        {item.location ? ` • ${item.location}` : ""}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.remainingCapacity == null ? "Open request" : `${item.remainingCapacity} spot${item.remainingCapacity === 1 ? "" : "s"} left`}
                      </div>
                    </div>
                    {!hasSlots ? (
                      <Button
                        disabled={creatingBooking || (item.remainingCapacity != null && item.remainingCapacity <= 0)}
                        onClick={() => handleRequest(item)}
                      >
                        Request
                      </Button>
                    ) : null}
                  </div>

                  {hasSlots ? (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Available slots
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.slots.map((slot: any) => {
                          const slotStart = new Date(slot.startsAt);
                          const slotTime = slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const disabled = slot.remainingCapacity != null && slot.remainingCapacity <= 0;
                          return (
                            <Button
                              key={slot.slotKey}
                              size="sm"
                              variant="outline"
                              disabled={creatingBooking || disabled}
                              onClick={() => handleRequest(item, slot.slotKey)}
                            >
                              {slotTime}
                              {slot.remainingCapacity != null ? ` • ${slot.remainingCapacity}` : ""}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {bookingsLoading ? (
            <p>Loading bookings...</p>
          ) : upcomingBookings.length === 0 ? (
            <p>No upcoming sessions scheduled.</p>
          ) : (
            upcomingBookings.map((booking: any) => {
              const start = booking.startsAt ? new Date(booking.startsAt) : null;
              const label = start
                ? start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
                : "TBD";
              const time = start ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
              const title = booking.serviceName || titleForType(booking.type);
              const status = (booking.status ?? "pending").toString();
              return (
                <div key={booking.id} className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{title}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{status}</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {label} {time ? `• ${time}` : ""}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </ParentShell>
  );
}

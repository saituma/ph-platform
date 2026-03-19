"use client";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { useEffect, useMemo, useState } from "react";
import {
  useCreateBookingMutation,
  useGetBookingAvailabilityQuery,
  useGetBookingServicesQuery,
  useGetUserBookingsQuery,
} from "../../../lib/apiSlice";

export default function ParentSchedulePage() {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data: servicesData, isLoading: servicesLoading } = useGetBookingServicesQuery();
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useGetUserBookingsQuery();
  const [createBooking, { isLoading: creatingBooking }] = useCreateBookingMutation();

  const services = useMemo(() => servicesData?.items ?? [], [servicesData]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayKey);

  const selectedService = useMemo(
    () => services.find((service: any) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const fixedTimeLabel = useMemo(() => {
    if (selectedService?.fixedStartTime) return selectedService.fixedStartTime;
    if (selectedService?.type === "role_model") return "13:00";
    return null;
  }, [selectedService]);

  const availabilityRange = useMemo(() => {
    if (!selectedDate) return null;
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [selectedDate]);

  const { data: availabilityData, isLoading: availabilityLoading } = useGetBookingAvailabilityQuery(
    availabilityRange && selectedServiceId
      ? { serviceTypeId: selectedServiceId, from: availabilityRange.from, to: availabilityRange.to }
      : ({} as any),
    { skip: !availabilityRange || !selectedServiceId },
  );

  const bookingCounts = useMemo(() => {
    const map = new Map<string, number>();
    (availabilityData?.bookings ?? []).forEach((booking: any) => {
      if (!booking?.startsAt) return;
      const key = new Date(booking.startsAt).toISOString();
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [availabilityData]);

  const availableSlots = useMemo(() => {
    if (!selectedService || !availabilityData?.items?.length) return [] as Date[];
    const durationMs = selectedService.durationMinutes * 60 * 1000;
    const slotMap = new Map<string, Date>();
    for (const block of availabilityData.items) {
      const start = new Date(block.startsAt);
      const end = new Date(block.endsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      for (let cursor = new Date(start.getTime()); cursor.getTime() + durationMs <= end.getTime(); cursor = new Date(cursor.getTime() + durationMs)) {
        const timeLabel = `${String(cursor.getHours()).padStart(2, "0")}:${String(cursor.getMinutes()).padStart(2, "0")}`;
        if (fixedTimeLabel && timeLabel !== fixedTimeLabel) continue;
        slotMap.set(cursor.toISOString(), cursor);
      }
    }
    return Array.from(slotMap.values()).sort((a, b) => a.getTime() - b.getTime());
  }, [availabilityData, selectedService, fixedTimeLabel]);

  useEffect(() => {
    if (!services.length || selectedServiceId) return;
    setSelectedServiceId(services[0]?.id ?? null);
  }, [services, selectedServiceId]);

  useEffect(() => {
    if (selectedService) {
      setLocation(selectedService.defaultLocation ?? "");
      setMeetingLink(selectedService.defaultMeetingLink ?? "");
    }
  }, [selectedService]);

  useEffect(() => {
    if (!availableSlots.length) {
      setSelectedSlot(null);
      return;
    }
    setSelectedSlot((prev) => {
      const capacity = selectedService?.capacity ?? null;
      const isPrevValid = prev && availableSlots.some((slot) => slot.toISOString() === prev.toISOString());
      if (isPrevValid) {
        if (!capacity) return prev;
        const prevCount = bookingCounts.get(prev.toISOString()) ?? 0;
        if (prevCount < capacity) return prev;
      }
      const firstAvailable = availableSlots.find((slot) => {
        if (!capacity) return true;
        const count = bookingCounts.get(slot.toISOString()) ?? 0;
        return count < capacity;
      });
      return firstAvailable ?? null;
    });
  }, [availableSlots, bookingCounts, selectedService]);

  const bookings = useMemo(() => bookingsData?.items ?? [], [bookingsData]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    bookings.forEach((booking: any) => {
      if (!booking.startsAt) return;
      const date = new Date(booking.startsAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(booking);
    });
    return map;
  }, [bookings]);

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
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ date, key });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedCalendarDate) ?? [];
  }, [eventsByDate, selectedCalendarDate]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking: any) => booking.startsAt && new Date(booking.startsAt) >= now)
      .sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [bookings]);

  const titleForType = (type?: string) => {
    switch (type) {
      case "group_call":
        return "Group Call";
      case "individual_call":
      case "one_on_one":
        return "Individual Call";
      case "lift_lab_1on1":
        return "Lift Lab 1:1";
      case "role_model":
        return "Role Model Call";
      case "call":
        return "Call";
      default:
        return "Session";
    }
  };

  return (
    <ParentShell
      title="Schedule"
      subtitle="Upcoming sessions and availability."
      actions={
        <Button
          onClick={() => {
            setSelectedDate(selectedCalendarDate);
            document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Book Session
        </Button>
      }
    >
      <Card id="booking-panel">
        <CardHeader>
          <CardTitle>Request a session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick a session type and day, then choose an open start time. The coach confirms before it&apos;s final.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={selectedServiceId ? String(selectedServiceId) : ""}
              onChange={(event) => setSelectedServiceId(Number(event.target.value))}
              disabled={servicesLoading || services.length === 0}
            >
              <option value="">Select service</option>
              {services.map((service: any) => (
                <option key={service.id} value={String(service.id)}>
                  {service.name}
                  {service.capacity ? ` • ${service.capacity} slots` : ""}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Available start times</p>
            {fixedTimeLabel ? (
              <p className="text-xs text-muted-foreground">
                This type always starts at {fixedTimeLabel} (when the coach opens that day).
              </p>
            ) : null}
            {availabilityLoading ? <p className="text-sm text-muted-foreground">Loading times…</p> : null}
            {!availabilityLoading && selectedService && availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open times on this day. Try another date or ask your coach to add availability.
              </p>
            ) : null}
            {availableSlots.length > 0 ? (
              <Select
                value={selectedSlot ? selectedSlot.toISOString() : ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedSlot(value ? new Date(value) : null);
                }}
              >
                <option value="">Select a time</option>
                {availableSlots.map((slot) => {
                  const cap = selectedService?.capacity ?? null;
                  const taken = bookingCounts.get(slot.toISOString()) ?? 0;
                  const atCap = cap != null && taken >= cap;
                  const label = slot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <option key={slot.toISOString()} value={slot.toISOString()} disabled={atCap}>
                      {label}
                      {cap != null ? ` (${Math.max(cap - taken, 0)} spots left)` : ""}
                      {atCap ? " — full" : ""}
                    </option>
                  );
                })}
              </Select>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Location (optional)"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <Input
              placeholder="Meeting link (optional)"
              value={meetingLink}
              onChange={(event) => setMeetingLink(event.target.value)}
            />
          </div>

          {bookingError ? <p className="text-sm text-red-500">{bookingError}</p> : null}
          {bookingSuccess ? <p className="text-sm text-green-600">{bookingSuccess}</p> : null}

          <Button
            disabled={!selectedService || !selectedSlot || creatingBooking}
            onClick={async () => {
              if (!selectedService || !selectedSlot) {
                setBookingError("Select a service and time slot.");
                return;
              }
              setBookingError(null);
              setBookingSuccess(null);
              try {
                const startsAt = new Date(selectedSlot);
                const endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);
                await createBooking({
                  serviceTypeId: selectedService.id,
                  startsAt: startsAt.toISOString(),
                  endsAt: endsAt.toISOString(),
                  timezoneOffsetMinutes: startsAt.getTimezoneOffset(),
                  location: location || undefined,
                  meetingLink: meetingLink || undefined,
                }).unwrap();
                setBookingSuccess("Request sent. Your coach will confirm it.");
                await refetchBookings();
              } catch (err: any) {
                setBookingError(err?.message ?? "Failed to submit booking.");
              }
            }}
          >
            Send request
          </Button>
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
              if (!cell) {
                return <div key={`empty-${index}`} className="h-10" />;
              }
              const isSelected = cell.key === selectedCalendarDate;
              const isToday = cell.key === todayKey;
              const hasEvents = eventsByDate.has(cell.key);
              return (
                <Button
                  key={cell.key}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-10 w-full ${isToday ? "border-primary" : ""}`}
                  onClick={() => {
                    setSelectedCalendarDate(cell.key);
                    setSelectedDate(cell.key);
                    setBookingError(null);
                    setBookingSuccess(null);
                  }}
                >
                  <span className="flex flex-col items-center justify-center gap-1">
                    <span>{cell.date.getDate()}</span>
                    {hasEvents ? <span className="h-1 w-1 rounded-full bg-primary" /> : null}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions on Selected Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {bookingsLoading ? (
            <p>Loading bookings...</p>
          ) : selectedDayEvents.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p>No sessions scheduled for this date.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth" })}
              >
                Book this date
              </Button>
            </div>
          ) : (
            selectedDayEvents.map((booking: any) => {
              const start = booking.startsAt ? new Date(booking.startsAt) : null;
              const time = start ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
              const title = titleForType(booking.type);
              const status = (booking.status ?? "pending").toString();
              return (
                <div key={booking.id} className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{title}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
                      {status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {time ? `Starts at ${time}` : "Time TBD"}
                  </div>
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
              const title = titleForType(booking.type);
              const status = (booking.status ?? "pending").toString();
              return (
                <div key={booking.id} className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{title}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
                      {status}
                    </span>
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
